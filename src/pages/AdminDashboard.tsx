import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import {
  ArrowLeft, Plus, Trash2, Edit, Users, FileCode, Eye, Bug,
  Terminal, Code2, Play, Save, Zap, Binary, Cpu, ChevronRight,
  CheckCircle, XCircle, Clock, Copy
} from 'lucide-react';

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  time_per_question: number;
  language: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
}

interface Question {
  id: string;
  quiz_id: string;
  title: string;
  incorrect_code: string;
  correct_code: string;
  expected_output: string;
  language: string;
  order_index: number;
}

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
}

type ProgrammingLanguage = 'java' | 'python' | 'cpp' | 'javascript' | 'go' | 'csharp' | 'ruby';

const LANGUAGES: { value: ProgrammingLanguage; label: string; monacoLang: string }[] = [
  { value: 'java', label: 'Java', monacoLang: 'java' },
  { value: 'python', label: 'Python', monacoLang: 'python' },
  { value: 'cpp', label: 'C++', monacoLang: 'cpp' },
  { value: 'javascript', label: 'JavaScript', monacoLang: 'javascript' },
  { value: 'go', label: 'Go', monacoLang: 'go' },
  { value: 'csharp', label: 'C#', monacoLang: 'csharp' },
  { value: 'ruby', label: 'Ruby', monacoLang: 'ruby' },
];

// Code templates for different languages
const CODE_TEMPLATES: Record<ProgrammingLanguage, { buggy: string; correct: string }> = {
  javascript: {
    buggy: `// Find the bug in this code
function reverseString(str) {
  let reversed = "";
  for (let i = str.length; i >= 0; i--) {
    reversed += str[i];
  }
  return reversed;
}

console.log(reverseString("hello"));`,
    correct: `// Corrected version
function reverseString(str) {
  let reversed = "";
  for (let i = str.length - 1; i >= 0; i--) {
    reversed += str[i];
  }
  return reversed;
}

console.log(reverseString("hello"));`
  },
  python: {
    buggy: `# Find the bug in this code
def find_max(numbers):
    max_num = 0
    for num in numbers:
        if num > max_num:
            max_num = num
    return max_num

print(find_max([-5, -2, -8, -1]))`,
    correct: `# Corrected version
def find_max(numbers):
    max_num = numbers[0]
    for num in numbers:
        if num > max_num:
            max_num = num
    return max_num

print(find_max([-5, -2, -8, -1]))`
  },
  java: {
    buggy: `// Find the bug in this code
public class Main {
    public static void main(String[] args) {
        int[] arr = {1, 2, 3, 4, 5};
        for (int i = 0; i <= arr.length; i++) {
            System.out.println(arr[i]);
        }
    }
}`,
    correct: `// Corrected version
public class Main {
    public static void main(String[] args) {
        int[] arr = {1, 2, 3, 4, 5};
        for (int i = 0; i < arr.length; i++) {
            System.out.println(arr[i]);
        }
    }
}`
  },
  cpp: {
    buggy: `// Find the bug in this code
#include <iostream>
using namespace std;

int main() {
    int arr[5] = {1, 2, 3, 4, 5};
    for (int i = 0; i <= 5; i++) {
        cout << arr[i] << endl;
    }
    return 0;
}`,
    correct: `// Corrected version
#include <iostream>
using namespace std;

int main() {
    int arr[5] = {1, 2, 3, 4, 5};
    for (int i = 0; i < 5; i++) {
        cout << arr[i] << endl;
    }
    return 0;
}`
  },
  go: {
    buggy: `// Find the bug in this code
package main

import "fmt"

func main() {
    slice := []int{1, 2, 3, 4, 5}
    for i := 0; i <= len(slice); i++ {
        fmt.Println(slice[i])
    }
}`,
    correct: `// Corrected version
package main

import "fmt"

func main() {
    slice := []int{1, 2, 3, 4, 5}
    for i := 0; i < len(slice); i++ {
        fmt.Println(slice[i])
    }
}`
  },
  csharp: {
    buggy: `// Find the bug in this code
using System;

class Program {
    static void Main() {
        int[] arr = {1, 2, 3, 4, 5};
        for (int i = 0; i <= arr.Length; i++) {
            Console.WriteLine(arr[i]);
        }
    }
}`,
    correct: `// Corrected version
using System;

class Program {
    static void Main() {
        int[] arr = {1, 2, 3, 4, 5};
        for (int i = 0; i < arr.Length; i++) {
            Console.WriteLine(arr[i]);
        }
    }
}`
  },
  ruby: {
    buggy: `# Find the bug in this code
def sum_array(arr)
  total = 0
  arr.each do |num|
    total = num
  end
  total
end

puts sum_array([1, 2, 3, 4, 5])`,
    correct: `# Corrected version
def sum_array(arr)
  total = 0
  arr.each do |num|
    total += num
  end
  total
end

puts sum_array([1, 2, 3, 4, 5])`
  }
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  // Quiz form state
  const [quizTitle, setQuizTitle] = useState('');
  const [quizDescription, setQuizDescription] = useState('');
  const [quizLanguage, setQuizLanguage] = useState<ProgrammingLanguage>('javascript');
  const [timePerQuestion, setTimePerQuestion] = useState(120);
  const [isQuizDialogOpen, setIsQuizDialogOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);

  // Question form state (IDE mode)
  const [questionTitle, setQuestionTitle] = useState('Fix the array index bug');
  const [incorrectCode, setIncorrectCode] = useState(CODE_TEMPLATES.javascript.buggy);
  const [correctCode, setCorrectCode] = useState(CODE_TEMPLATES.javascript.correct);
  const [expectedOutput, setExpectedOutput] = useState('olleh');
  const [isQuestionDialogOpen, setIsQuestionDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [ideTab, setIdeTab] = useState<'buggy' | 'correct'>('buggy');

  // Assignment state
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);

  useEffect(() => {
    fetchQuizzes();
    fetchUsers();
  }, []);

  useEffect(() => {
    if (selectedQuiz) {
      fetchQuestions(selectedQuiz.id);
      // Update code template when quiz language changes
      const template = CODE_TEMPLATES[selectedQuiz.language as ProgrammingLanguage];
      if (template && !editingQuestion) {
        setIncorrectCode(template.buggy);
        setCorrectCode(template.correct);
      }
    }
  }, [selectedQuiz]);

  const fetchQuizzes = async () => {
    const { data, error } = await supabase
      .from('quizzes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching quizzes:', error);
    } else {
      setQuizzes((data as Quiz[]) || []);
    }
    setLoading(false);
  };

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('email');

    if (error) {
      console.error('Error fetching users:', error);
    } else {
      setUsers((data as Profile[]) || []);
    }
  };

  const fetchQuestions = async (quizId: string) => {
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('quiz_id', quizId)
      .order('order_index');

    if (error) {
      console.error('Error fetching questions:', error);
    } else {
      setQuestions((data as Question[]) || []);
    }
  };

  const handleCreateQuiz = async () => {
    if (!user) return;

    const quizData = {
      title: quizTitle,
      description: quizDescription || null,
      language: quizLanguage,
      time_per_question: timePerQuestion,
      created_by: user.id,
    };

    if (editingQuiz) {
      const { error } = await supabase
        .from('quizzes')
        .update(quizData)
        .eq('id', editingQuiz.id);

      if (error) {
        toast({ title: 'Error', description: 'Failed to update quiz', variant: 'destructive' });
      } else {
        toast({ title: 'Success', description: 'Quiz updated successfully' });
        fetchQuizzes();
      }
    } else {
      const { error } = await supabase
        .from('quizzes')
        .insert([quizData]);

      if (error) {
        toast({ title: 'Error', description: 'Failed to create quiz', variant: 'destructive' });
      } else {
        toast({ title: 'Success', description: 'Quiz created successfully' });
        fetchQuizzes();
      }
    }

    resetQuizForm();
    setIsQuizDialogOpen(false);
  };

  const handleDeleteQuiz = async (quizId: string) => {
    const { error } = await supabase
      .from('quizzes')
      .delete()
      .eq('id', quizId);

    if (error) {
      toast({ title: 'Error', description: 'Failed to delete quiz', variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Quiz deleted successfully' });
      if (selectedQuiz?.id === quizId) {
        setSelectedQuiz(null);
        setQuestions([]);
      }
      fetchQuizzes();
    }
  };

  const handleCreateQuestion = async () => {
    if (!selectedQuiz) return;

    const questionData = {
      quiz_id: selectedQuiz.id,
      title: questionTitle,
      incorrect_code: incorrectCode,
      correct_code: correctCode,
      expected_output: expectedOutput,
      language: selectedQuiz.language,
      order_index: questions.length,
    };

    if (editingQuestion) {
      const { error } = await supabase
        .from('questions')
        .update(questionData)
        .eq('id', editingQuestion.id);

      if (error) {
        toast({ title: 'Error', description: 'Failed to update question', variant: 'destructive' });
      } else {
        toast({ title: 'Success', description: 'Question updated successfully' });
        fetchQuestions(selectedQuiz.id);
      }
    } else {
      const { error } = await supabase
        .from('questions')
        .insert([questionData]);

      if (error) {
        toast({ title: 'Error', description: 'Failed to create question', variant: 'destructive' });
      } else {
        toast({ title: 'Success', description: 'Question created successfully' });
        fetchQuestions(selectedQuiz.id);
      }
    }

    resetQuestionForm();
    setIsQuestionDialogOpen(false);
  };

  const handleDeleteQuestion = async (questionId: string) => {
    const { error } = await supabase
      .from('questions')
      .delete()
      .eq('id', questionId);

    if (error) {
      toast({ title: 'Error', description: 'Failed to delete question', variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Question deleted successfully' });
      if (selectedQuiz) {
        fetchQuestions(selectedQuiz.id);
      }
    }
  };

  const handleAssignQuiz = async () => {
    if (!selectedQuiz || selectedUsers.length === 0) return;

    const assignments = selectedUsers.map(userId => ({
      quiz_id: selectedQuiz.id,
      user_id: userId,
    }));

    const { error } = await supabase
      .from('quiz_assignments')
      .upsert(assignments, { onConflict: 'quiz_id,user_id' });

    if (error) {
      toast({ title: 'Error', description: 'Failed to assign quiz', variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: `Quiz assigned to ${selectedUsers.length} user(s)` });
      setSelectedUsers([]);
      setIsAssignDialogOpen(false);
    }
  };

  const resetQuizForm = () => {
    setQuizTitle('');
    setQuizDescription('');
    setQuizLanguage('javascript');
    setTimePerQuestion(120);
    setEditingQuiz(null);
  };

  const resetQuestionForm = () => {
    const lang = selectedQuiz?.language as ProgrammingLanguage || 'javascript';
    setQuestionTitle('Fix the bug');
    setIncorrectCode(CODE_TEMPLATES[lang]?.buggy || CODE_TEMPLATES.javascript.buggy);
    setCorrectCode(CODE_TEMPLATES[lang]?.correct || CODE_TEMPLATES.javascript.correct);
    setExpectedOutput('');
    setEditingQuestion(null);
    setIdeTab('buggy');
  };

  const openEditQuiz = (quiz: Quiz) => {
    setEditingQuiz(quiz);
    setQuizTitle(quiz.title);
    setQuizDescription(quiz.description || '');
    setQuizLanguage(quiz.language as ProgrammingLanguage);
    setTimePerQuestion(quiz.time_per_question);
    setIsQuizDialogOpen(true);
  };

  const openEditQuestion = (question: Question) => {
    setEditingQuestion(question);
    setQuestionTitle(question.title);
    setIncorrectCode(question.incorrect_code);
    setCorrectCode(question.correct_code);
    setExpectedOutput(question.expected_output);
    setIsQuestionDialogOpen(true);
  };

  const loadTemplate = () => {
    const lang = selectedQuiz?.language as ProgrammingLanguage || 'javascript';
    const template = CODE_TEMPLATES[lang];
    if (template) {
      setIncorrectCode(template.buggy);
      setCorrectCode(template.correct);
      toast({ title: 'Template Loaded', description: `Loaded ${lang} template` });
    }
  };

  const getMonacoLanguage = (lang: string) => {
    return LANGUAGES.find(l => l.value === lang)?.monacoLang || 'javascript';
  };

  return (
    <div className="dark min-h-screen bg-black matrix-bg relative overflow-hidden">
      <div className="absolute inset-0 scanline pointer-events-none opacity-20" />

      {/* Header */}
      <header className="border-b border-matrix-green/20 glass-effect sticky top-0 z-50 bg-black/80">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="hover:bg-matrix-green/10 text-matrix-green">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-black border border-matrix-green/50 border-glow animate-pulse-glow">
                <Bug className="w-6 h-6 text-matrix-green" />
              </div>
              <div>
                <span className="text-xl font-bold text-matrix-green font-matrix tracking-wider text-glow">
                  ADMIN<span className="text-white">_</span>PANEL
                </span>
                <div className="flex items-center gap-2 text-matrix-green/50 text-xs font-mono">
                  <Terminal className="w-3 h-3" />
                  <span>Quiz Management System</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-matrix-green/60 font-mono text-sm">
            <Cpu className="w-4 h-4 animate-pulse" />
            <span>{user?.email}</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 relative z-10">
        <Tabs defaultValue="quizzes" className="w-full">
          <TabsList className="bg-black border border-matrix-green/20 mb-6">
            <TabsTrigger value="quizzes" className="font-mono data-[state=active]:bg-matrix-green data-[state=active]:text-black text-matrix-green/70">
              <FileCode className="w-4 h-4 mr-2" />
              Quizzes
            </TabsTrigger>
            <TabsTrigger value="ide" className="font-mono data-[state=active]:bg-matrix-green data-[state=active]:text-black text-matrix-green/70" disabled={!selectedQuiz}>
              <Code2 className="w-4 h-4 mr-2" />
              IDE Editor {selectedQuiz && `(${selectedQuiz.title})`}
            </TabsTrigger>
            <TabsTrigger value="users" className="font-mono data-[state=active]:bg-matrix-green data-[state=active]:text-black text-matrix-green/70">
              <Users className="w-4 h-4 mr-2" />
              Assign Users
            </TabsTrigger>
          </TabsList>

          {/* QUIZZES TAB */}
          <TabsContent value="quizzes">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-matrix-green font-matrix tracking-wide text-glow">
                  <span className="text-white">{'>'}</span> Manage Quizzes
                </h2>
                <p className="text-matrix-green/50 font-mono text-sm mt-1">Create and manage debugging challenges</p>
              </div>
              <Dialog open={isQuizDialogOpen} onOpenChange={(open) => {
                setIsQuizDialogOpen(open);
                if (!open) resetQuizForm();
              }}>
                <DialogTrigger asChild>
                  <Button className="font-mono bg-matrix-green hover:bg-matrix-green-light text-black font-bold">
                    <Plus className="w-4 h-4 mr-2" />
                    New Quiz
                  </Button>
                </DialogTrigger>
                <DialogContent className="glass-effect border-matrix-green/30 bg-black/95 max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="font-matrix text-matrix-green text-glow flex items-center gap-2">
                      <Zap className="w-5 h-5" />
                      {editingQuiz ? 'Edit Quiz' : 'Create New Quiz'}
                    </DialogTitle>
                    <DialogDescription className="text-matrix-green/60">
                      Configure your debugging challenge quiz
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label className="font-mono text-matrix-green">Title</Label>
                      <Input
                        value={quizTitle}
                        onChange={(e) => setQuizTitle(e.target.value)}
                        placeholder="JavaScript Debugging Challenge"
                        className="bg-black border-matrix-green/30 text-matrix-green focus:border-matrix-green placeholder:text-matrix-green/30"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-mono text-matrix-green">Description</Label>
                      <Textarea
                        value={quizDescription}
                        onChange={(e) => setQuizDescription(e.target.value)}
                        placeholder="Find and fix common bugs in JavaScript code"
                        className="bg-black border-matrix-green/30 text-matrix-green focus:border-matrix-green placeholder:text-matrix-green/30"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="font-mono text-matrix-green">Language</Label>
                        <Select value={quizLanguage} onValueChange={(v) => setQuizLanguage(v as ProgrammingLanguage)}>
                          <SelectTrigger className="bg-black border-matrix-green/30 text-matrix-green">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-black border-matrix-green/30">
                            {LANGUAGES.map((lang) => (
                              <SelectItem key={lang.value} value={lang.value} className="text-matrix-green focus:bg-matrix-green/20">
                                {lang.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="font-mono text-matrix-green">Time/Question (s)</Label>
                        <Input
                          type="number"
                          value={timePerQuestion}
                          onChange={(e) => setTimePerQuestion(Number(e.target.value))}
                          className="bg-black border-matrix-green/30 text-matrix-green focus:border-matrix-green"
                        />
                      </div>
                    </div>
                    <Button onClick={handleCreateQuiz} className="w-full font-mono bg-matrix-green hover:bg-matrix-green-light text-black font-bold">
                      <Save className="w-4 h-4 mr-2" />
                      {editingQuiz ? 'Update Quiz' : 'Create Quiz'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {loading ? (
              <div className="text-center py-10 text-matrix-green font-mono animate-pulse text-glow">
                <Zap className="w-8 h-8 mx-auto mb-2 animate-pulse" />
                Loading quizzes...
              </div>
            ) : quizzes.length === 0 ? (
              <Card className="glass-effect border-matrix-green/20 bg-black/80 cyber-border">
                <CardContent className="flex flex-col items-center py-16">
                  <div className="p-4 rounded-xl bg-black border border-matrix-green/30 border-glow mb-4">
                    <FileCode className="w-12 h-12 text-matrix-green/50" />
                  </div>
                  <p className="text-matrix-green/50 font-mono text-lg">No quizzes created yet</p>
                  <p className="text-matrix-green/30 font-mono text-sm mt-2">Click "New Quiz" to get started</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {quizzes.map((quiz) => (
                  <Card
                    key={quiz.id}
                    className={`glass-effect border-matrix-green/20 hover:border-matrix-green/60 transition-all duration-300 bg-black/80 cyber-border cursor-pointer ${selectedQuiz?.id === quiz.id ? 'border-matrix-green ring-2 ring-matrix-green/30' : ''}`}
                    onClick={() => setSelectedQuiz(quiz)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <Badge variant="outline" className="mb-2 border-matrix-green/30 text-matrix-green font-mono">
                          {quiz.language.toUpperCase()}
                        </Badge>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openEditQuiz(quiz); }} className="hover:bg-matrix-green/10 text-matrix-green h-8 w-8">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleDeleteQuiz(quiz.id); }} className="hover:bg-red-500/10 h-8 w-8">
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </Button>
                        </div>
                      </div>
                      <CardTitle className="font-matrix text-matrix-green text-glow">{quiz.title}</CardTitle>
                      <CardDescription className="text-matrix-green/50 line-clamp-2">{quiz.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 text-sm text-matrix-green/60 font-mono mb-3">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {quiz.time_per_question}s
                        </div>
                        <div className="flex items-center gap-1">
                          <Binary className="w-4 h-4" />
                          {quiz.is_active ? 'Active' : 'Inactive'}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 font-mono border-matrix-green/30 text-matrix-green hover:bg-matrix-green/10"
                          onClick={(e) => { e.stopPropagation(); setSelectedQuiz(quiz); }}
                        >
                          <Code2 className="w-4 h-4 mr-1" />
                          Open IDE
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* IDE EDITOR TAB */}
          <TabsContent value="ide">
            {selectedQuiz ? (
              <div className="space-y-6">
                {/* IDE Header */}
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold text-matrix-green font-matrix tracking-wide text-glow flex items-center gap-2">
                      <Code2 className="w-6 h-6" />
                      <span className="text-white">{'>'}</span> Question IDE
                    </h2>
                    <p className="text-matrix-green/50 font-mono text-sm mt-1">
                      Create debugging challenges for: <span className="text-matrix-green">{selectedQuiz.title}</span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={loadTemplate}
                      className="font-mono border-matrix-green/30 text-matrix-green hover:bg-matrix-green/10"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Load Template
                    </Button>
                    <Dialog open={isQuestionDialogOpen} onOpenChange={(open) => {
                      setIsQuestionDialogOpen(open);
                      if (!open) resetQuestionForm();
                    }}>
                      <DialogTrigger asChild>
                        <Button className="font-mono bg-matrix-green hover:bg-matrix-green-light text-black font-bold">
                          <Plus className="w-4 h-4 mr-2" />
                          Add Question
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="glass-effect border-matrix-green/30 bg-black/95 max-w-5xl max-h-[90vh] overflow-hidden">
                        <DialogHeader>
                          <DialogTitle className="font-matrix text-matrix-green text-glow flex items-center gap-2">
                            <Terminal className="w-5 h-5" />
                            {editingQuestion ? 'Edit Question' : 'Create New Question'}
                          </DialogTitle>
                          <DialogDescription className="text-matrix-green/60">
                            Write buggy code and its correct solution using the IDE below
                          </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 mt-4 overflow-auto max-h-[calc(90vh-150px)]">
                          {/* Question Title */}
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="font-mono text-matrix-green">Question Title</Label>
                              <Input
                                value={questionTitle}
                                onChange={(e) => setQuestionTitle(e.target.value)}
                                placeholder="Fix the array index bug"
                                className="bg-black border-matrix-green/30 text-matrix-green focus:border-matrix-green placeholder:text-matrix-green/30"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="font-mono text-matrix-green">Expected Output</Label>
                              <Input
                                value={expectedOutput}
                                onChange={(e) => setExpectedOutput(e.target.value)}
                                placeholder="The correct output after fixing"
                                className="bg-black border-matrix-green/30 text-matrix-green focus:border-matrix-green placeholder:text-matrix-green/30"
                              />
                            </div>
                          </div>

                          {/* IDE Tabs */}
                          <div className="rounded-lg border border-matrix-green/30 overflow-hidden">
                            <div className="bg-black/50 border-b border-matrix-green/20 p-2 flex items-center gap-2">
                              <Button
                                variant={ideTab === 'buggy' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setIdeTab('buggy')}
                                className={`font-mono ${ideTab === 'buggy' ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'text-matrix-green/70 hover:text-matrix-green'}`}
                              >
                                <XCircle className="w-4 h-4 mr-1" />
                                Buggy Code
                              </Button>
                              <Button
                                variant={ideTab === 'correct' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setIdeTab('correct')}
                                className={`font-mono ${ideTab === 'correct' ? 'bg-matrix-green/20 text-matrix-green border-matrix-green/30' : 'text-matrix-green/70 hover:text-matrix-green'}`}
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Correct Code
                              </Button>
                              <div className="flex-1" />
                              <Badge variant="outline" className="border-matrix-green/30 text-matrix-green font-mono">
                                {selectedQuiz.language.toUpperCase()}
                              </Badge>
                            </div>

                            <div className="h-[350px]">
                              <Editor
                                height="100%"
                                language={getMonacoLanguage(selectedQuiz.language)}
                                value={ideTab === 'buggy' ? incorrectCode : correctCode}
                                onChange={(value) => {
                                  if (ideTab === 'buggy') {
                                    setIncorrectCode(value || '');
                                  } else {
                                    setCorrectCode(value || '');
                                  }
                                }}
                                theme="vs-dark"
                                options={{
                                  fontSize: 14,
                                  fontFamily: 'JetBrains Mono, monospace',
                                  minimap: { enabled: false },
                                  scrollBeyondLastLine: false,
                                  padding: { top: 16, bottom: 16 },
                                  lineNumbers: 'on',
                                  renderLineHighlight: 'all',
                                }}
                              />
                            </div>
                          </div>

                          <Button
                            onClick={handleCreateQuestion}
                            className="w-full font-mono bg-matrix-green hover:bg-matrix-green-light text-black font-bold"
                          >
                            <Save className="w-4 h-4 mr-2" />
                            {editingQuestion ? 'Update Question' : 'Save Question'}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                {/* Questions List */}
                <div className="space-y-4">
                  <h3 className="text-lg font-matrix text-matrix-green flex items-center gap-2">
                    <Binary className="w-5 h-5" />
                    Questions ({questions.length})
                  </h3>

                  {questions.length === 0 ? (
                    <Card className="glass-effect border-matrix-green/20 bg-black/80 cyber-border">
                      <CardContent className="flex flex-col items-center py-12">
                        <Terminal className="w-12 h-12 text-matrix-green/30 mb-4" />
                        <p className="text-matrix-green/50 font-mono">No questions added yet</p>
                        <p className="text-matrix-green/30 font-mono text-sm mt-1">Click "Add Question" to create the first challenge</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {questions.map((question, index) => (
                        <Card key={question.id} className="glass-effect border-matrix-green/20 bg-black/80 hover:border-matrix-green/40 transition-all">
                          <CardContent className="py-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-4">
                                <div className="p-2 rounded-lg bg-matrix-green/10 border border-matrix-green/30">
                                  <span className="text-matrix-green font-mono font-bold">Q{index + 1}</span>
                                </div>
                                <div>
                                  <h4 className="font-matrix text-matrix-green text-lg">{question.title}</h4>
                                  <p className="text-matrix-green/50 font-mono text-sm mt-1">
                                    Expected: <code className="bg-matrix-green/10 px-2 py-0.5 rounded">{question.expected_output || 'N/A'}</code>
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button variant="ghost" size="icon" onClick={() => openEditQuestion(question)} className="hover:bg-matrix-green/10 text-matrix-green">
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDeleteQuestion(question.id)} className="hover:bg-red-500/10">
                                  <Trash2 className="w-4 h-4 text-red-400" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <Card className="glass-effect border-matrix-green/20 bg-black/80 cyber-border">
                <CardContent className="flex flex-col items-center py-16">
                  <Code2 className="w-16 h-16 text-matrix-green/30 mb-4" />
                  <p className="text-matrix-green/50 font-mono text-lg">Select a quiz first</p>
                  <p className="text-matrix-green/30 font-mono text-sm mt-2">Go to Quizzes tab and select a quiz to add questions</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ASSIGN USERS TAB */}
          <TabsContent value="users">
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-matrix-green font-matrix tracking-wide text-glow">
                  <span className="text-white">{'>'}</span> Assign Quizzes to Users
                </h2>
                <p className="text-matrix-green/50 font-mono text-sm mt-1">Select a quiz and assign it to participants</p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Quiz Selection */}
                <Card className="glass-effect border-matrix-green/20 bg-black/80">
                  <CardHeader>
                    <CardTitle className="font-matrix text-matrix-green flex items-center gap-2">
                      <FileCode className="w-5 h-5" />
                      Select Quiz
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[300px] pr-4">
                      <div className="space-y-2">
                        {quizzes.map((quiz) => (
                          <div
                            key={quiz.id}
                            onClick={() => setSelectedQuiz(quiz)}
                            className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedQuiz?.id === quiz.id
                              ? 'border-matrix-green bg-matrix-green/10'
                              : 'border-matrix-green/20 hover:border-matrix-green/40'
                              }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-matrix-green font-mono">{quiz.title}</span>
                              <Badge variant="outline" className="border-matrix-green/30 text-matrix-green text-xs">
                                {quiz.language}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* User Selection */}
                <Card className="glass-effect border-matrix-green/20 bg-black/80">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="font-matrix text-matrix-green flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Select Users ({selectedUsers.length} selected)
                    </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (selectedUsers.length === users.length) {
                          setSelectedUsers([]);
                        } else {
                          setSelectedUsers(users.map(u => u.id));
                        }
                      }}
                      className="text-xs h-7 border-matrix-green/30 text-matrix-green hover:bg-matrix-green/10 font-mono"
                    >
                      {selectedUsers.length === users.length ? 'DESELECT_ALL' : 'SELECT_ALL'}
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[300px] pr-4">
                      <div className="space-y-2">
                        {users.map((u) => (
                          <label
                            key={u.id}
                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${selectedUsers.includes(u.id)
                              ? 'border-matrix-green bg-matrix-green/10'
                              : 'border-matrix-green/20 hover:border-matrix-green/40'
                              }`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedUsers.includes(u.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedUsers([...selectedUsers, u.id]);
                                } else {
                                  setSelectedUsers(selectedUsers.filter(id => id !== u.id));
                                }
                              }}
                              className="rounded accent-matrix-green w-4 h-4"
                            />
                            <div>
                              <span className="font-mono text-matrix-green">{u.full_name || 'Anonymous'}</span>
                              <p className="text-matrix-green/50 text-xs font-mono">{u.email}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </ScrollArea>

                    <Button
                      onClick={handleAssignQuiz}
                      disabled={!selectedQuiz || selectedUsers.length === 0}
                      className="w-full mt-4 font-mono bg-matrix-green hover:bg-matrix-green-light text-black font-bold disabled:opacity-50"
                    >
                      <ChevronRight className="w-4 h-4 mr-2" />
                      Assign to {selectedUsers.length} User(s)
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t border-matrix-green/10 py-4 mt-8 relative z-10">
        <div className="container mx-auto px-4 text-center">
          <p className="text-matrix-green/30 text-xs font-mono tracking-widest">
            {'</>'}ADMIN PANEL v2.0 | <span className="text-matrix-green/50">MATRIX</span> EDITION{'</>'}
          </p>
        </div>
      </footer>
    </div>
  );
}
