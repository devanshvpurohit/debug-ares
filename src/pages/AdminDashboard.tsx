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
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Edit, Users, FileCode, Eye, Bug } from 'lucide-react';

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

const LANGUAGES: { value: ProgrammingLanguage; label: string }[] = [
  { value: 'java', label: 'Java' },
  { value: 'python', label: 'Python' },
  { value: 'cpp', label: 'C++' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'go', label: 'Go' },
  { value: 'csharp', label: 'C#' },
  { value: 'ruby', label: 'Ruby' },
];

export default function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [quizTitle, setQuizTitle] = useState('');
  const [quizDescription, setQuizDescription] = useState('');
  const [quizLanguage, setQuizLanguage] = useState<ProgrammingLanguage>('java');
  const [timePerQuestion, setTimePerQuestion] = useState(150);
  const [isQuizDialogOpen, setIsQuizDialogOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  
  const [questionTitle, setQuestionTitle] = useState('');
  const [incorrectCode, setIncorrectCode] = useState('');
  const [correctCode, setCorrectCode] = useState('');
  const [expectedOutput, setExpectedOutput] = useState('');
  const [isQuestionDialogOpen, setIsQuestionDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);

  useEffect(() => {
    fetchQuizzes();
    fetchUsers();
  }, []);

  useEffect(() => {
    if (selectedQuiz) {
      fetchQuestions(selectedQuiz.id);
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
    setQuizLanguage('java');
    setTimePerQuestion(150);
    setEditingQuiz(null);
  };

  const resetQuestionForm = () => {
    setQuestionTitle('');
    setIncorrectCode('');
    setCorrectCode('');
    setExpectedOutput('');
    setEditingQuestion(null);
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

  return (
    <div className="dark min-h-screen bg-background obsidian-gradient">
      <div className="absolute inset-0 scanline pointer-events-none opacity-30" />
      
      <header className="border-b border-border/50 glass-effect sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="hover:bg-primary/10">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20 border border-primary/30">
                <Bug className="w-6 h-6 text-primary" />
              </div>
              <span className="text-xl font-bold text-foreground font-mono">
                ADMIN<span className="text-primary">_</span>PANEL
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 relative z-10">
        <Tabs defaultValue="quizzes" className="w-full">
          <TabsList className="bg-muted/50 mb-6">
            <TabsTrigger value="quizzes" className="font-mono data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <FileCode className="w-4 h-4 mr-2" />
              Quizzes
            </TabsTrigger>
            <TabsTrigger value="questions" className="font-mono data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" disabled={!selectedQuiz}>
              <Edit className="w-4 h-4 mr-2" />
              Questions {selectedQuiz && `(${selectedQuiz.title})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="quizzes">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-foreground font-mono">
                <span className="text-primary">&gt;</span> Manage Quizzes
              </h2>
              <Dialog open={isQuizDialogOpen} onOpenChange={(open) => {
                setIsQuizDialogOpen(open);
                if (!open) resetQuizForm();
              }}>
                <DialogTrigger asChild>
                  <Button className="font-mono bg-primary hover:bg-primary/90">
                    <Plus className="w-4 h-4 mr-2" />
                    New Quiz
                  </Button>
                </DialogTrigger>
                <DialogContent className="glass-effect border-primary/20">
                  <DialogHeader>
                    <DialogTitle className="font-mono text-foreground">
                      {editingQuiz ? 'Edit Quiz' : 'Create New Quiz'}
                    </DialogTitle>
                    <DialogDescription>
                      Configure your debugging challenge quiz
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label className="font-mono text-foreground">Title</Label>
                      <Input
                        value={quizTitle}
                        onChange={(e) => setQuizTitle(e.target.value)}
                        placeholder="Quiz title"
                        className="bg-background/50 border-primary/30"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-mono text-foreground">Description</Label>
                      <Textarea
                        value={quizDescription}
                        onChange={(e) => setQuizDescription(e.target.value)}
                        placeholder="Quiz description"
                        className="bg-background/50 border-primary/30"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="font-mono text-foreground">Language</Label>
                        <Select value={quizLanguage} onValueChange={(v) => setQuizLanguage(v as ProgrammingLanguage)}>
                          <SelectTrigger className="bg-background/50 border-primary/30">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {LANGUAGES.map((lang) => (
                              <SelectItem key={lang.value} value={lang.value}>
                                {lang.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="font-mono text-foreground">Time/Question (s)</Label>
                        <Input
                          type="number"
                          value={timePerQuestion}
                          onChange={(e) => setTimePerQuestion(Number(e.target.value))}
                          className="bg-background/50 border-primary/30"
                        />
                      </div>
                    </div>
                    <Button onClick={handleCreateQuiz} className="w-full font-mono bg-primary hover:bg-primary/90">
                      {editingQuiz ? 'Update Quiz' : 'Create Quiz'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {loading ? (
              <div className="text-center py-10 text-muted-foreground font-mono">Loading...</div>
            ) : quizzes.length === 0 ? (
              <Card className="glass-effect border-border/50">
                <CardContent className="flex flex-col items-center py-10">
                  <FileCode className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground font-mono">No quizzes created yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {quizzes.map((quiz) => (
                  <Card key={quiz.id} className="glass-effect border-border/50 hover:border-primary/50 transition-all duration-300">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <Badge variant="outline" className="mb-2 border-primary/30 text-primary">
                          {quiz.language.toUpperCase()}
                        </Badge>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditQuiz(quiz)} className="hover:bg-primary/10">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteQuiz(quiz.id)} className="hover:bg-destructive/10">
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      <CardTitle className="font-mono text-foreground">{quiz.title}</CardTitle>
                      <CardDescription>{quiz.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground font-mono mb-4">
                        {quiz.time_per_question}s per question
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 font-mono border-primary/30 hover:bg-primary/10"
                          onClick={() => setSelectedQuiz(quiz)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Questions
                        </Button>
                        <Dialog open={isAssignDialogOpen && selectedQuiz?.id === quiz.id} onOpenChange={(open) => {
                          setIsAssignDialogOpen(open);
                          if (open) setSelectedQuiz(quiz);
                        }}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="flex-1 font-mono border-primary/30 hover:bg-primary/10">
                              <Users className="w-4 h-4 mr-1" />
                              Assign
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="glass-effect border-primary/20">
                            <DialogHeader>
                              <DialogTitle className="font-mono text-foreground">Assign Quiz</DialogTitle>
                              <DialogDescription>
                                Select users to assign this quiz to
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                              {users.map((u) => (
                                <label
                                  key={u.id}
                                  className="flex items-center gap-2 p-2 rounded hover:bg-primary/10 cursor-pointer"
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
                                    className="rounded accent-primary"
                                  />
                                  <span className="font-mono text-sm">{u.email}</span>
                                </label>
                              ))}
                            </div>
                            <Button onClick={handleAssignQuiz} className="w-full font-mono bg-primary hover:bg-primary/90">
                              Assign to {selectedUsers.length} user(s)
                            </Button>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="questions">
            {selectedQuiz && (
              <>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-foreground font-mono">
                      <span className="text-primary">&gt;</span> Questions for {selectedQuiz.title}
                    </h2>
                    <p className="text-muted-foreground text-sm font-mono">
                      Language: {selectedQuiz.language.toUpperCase()}
                    </p>
                  </div>
                  <Dialog open={isQuestionDialogOpen} onOpenChange={(open) => {
                    setIsQuestionDialogOpen(open);
                    if (!open) resetQuestionForm();
                  }}>
                    <DialogTrigger asChild>
                      <Button className="font-mono bg-primary hover:bg-primary/90">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Question
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="glass-effect border-primary/20 max-w-2xl">
                      <DialogHeader>
                        <DialogTitle className="font-mono text-foreground">
                          {editingQuestion ? 'Edit Question' : 'Add Question'}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 mt-4">
                        <div className="space-y-2">
                          <Label className="font-mono text-foreground">Question Title</Label>
                          <Input
                            value={questionTitle}
                            onChange={(e) => setQuestionTitle(e.target.value)}
                            placeholder="Fix the array index error"
                            className="bg-background/50 border-primary/30"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="font-mono text-foreground">Incorrect Code (with bug)</Label>
                          <Textarea
                            value={incorrectCode}
                            onChange={(e) => setIncorrectCode(e.target.value)}
                            placeholder="Paste the buggy code here..."
                            className="bg-background/50 border-primary/30 font-mono min-h-32"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="font-mono text-foreground">Correct Code (solution)</Label>
                          <Textarea
                            value={correctCode}
                            onChange={(e) => setCorrectCode(e.target.value)}
                            placeholder="Paste the correct solution here..."
                            className="bg-background/50 border-primary/30 font-mono min-h-32"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="font-mono text-foreground">Expected Output</Label>
                          <Textarea
                            value={expectedOutput}
                            onChange={(e) => setExpectedOutput(e.target.value)}
                            placeholder="What should the code output?"
                            className="bg-background/50 border-primary/30 font-mono"
                          />
                        </div>
                        <Button onClick={handleCreateQuestion} className="w-full font-mono bg-primary hover:bg-primary/90">
                          {editingQuestion ? 'Update Question' : 'Add Question'}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                {questions.length === 0 ? (
                  <Card className="glass-effect border-border/50">
                    <CardContent className="flex flex-col items-center py-10">
                      <FileCode className="w-12 h-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground font-mono">No questions added yet</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {questions.map((question, index) => (
                      <Card key={question.id} className="glass-effect border-border/50">
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <Badge variant="outline" className="mb-2 border-primary/30 text-primary">
                                Q{index + 1}
                              </Badge>
                              <CardTitle className="font-mono text-foreground text-lg">
                                {question.title}
                              </CardTitle>
                            </div>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => openEditQuestion(question)} className="hover:bg-primary/10">
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteQuestion(question.id)} className="hover:bg-destructive/10">
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs text-muted-foreground font-mono mb-1">BUGGY CODE</p>
                              <pre className="bg-background/50 p-2 rounded text-xs overflow-x-auto max-h-24 border border-border/30">
                                {question.incorrect_code.slice(0, 200)}...
                              </pre>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground font-mono mb-1">EXPECTED OUTPUT</p>
                              <pre className="bg-background/50 p-2 rounded text-xs overflow-x-auto max-h-24 border border-border/30">
                                {question.expected_output}
                              </pre>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
