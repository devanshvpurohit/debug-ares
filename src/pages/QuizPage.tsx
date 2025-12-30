import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import Editor from '@monaco-editor/react';
import { AlertTriangle, Clock, ChevronRight, Bug, CheckCircle } from 'lucide-react';

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  time_per_question: number;
  language: string;
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

interface QuizAssignment {
  id: string;
  quiz_id: string;
  user_id: string;
  is_completed: boolean;
  started_at: string | null;
  completed_at: string | null;
}

const languageToMonaco: Record<string, string> = {
  java: 'java',
  python: 'python',
  cpp: 'cpp',
  javascript: 'javascript',
  go: 'go',
  csharp: 'csharp',
  ruby: 'ruby',
};

function normalizeCode(code: string): string {
  return code
    .replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}();,])\s*/g, '$1')
    .trim()
    .toLowerCase();
}

export default function QuizPage() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [assignment, setAssignment] = useState<QuizAssignment | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userCode, setUserCode] = useState('');
  const [timeLeft, setTimeLeft] = useState(150);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [results, setResults] = useState<{ correct: number; total: number } | null>(null);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  
  const questionStartTime = useRef<number>(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentQuestion = questions[currentQuestionIndex];

  useEffect(() => {
    if (assignmentId) {
      fetchQuizData();
    }
  }, [assignmentId]);

  useEffect(() => {
    if (!loading && !quizCompleted && currentQuestion) {
      questionStartTime.current = Date.now();
      setTimeLeft(quiz?.time_per_question || 150);
      
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [currentQuestionIndex, loading, quizCompleted, currentQuestion]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && !quizCompleted && currentQuestion) {
        setTabSwitchCount((prev) => prev + 1);
        logCheatEvent('tab_switch', 'User switched away from quiz tab');
        toast({
          title: 'Warning!',
          description: 'Tab switching detected. This incident has been logged.',
          variant: 'destructive',
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [quizCompleted, currentQuestion]);

  useEffect(() => {
    const handlePopState = () => {
      if (!quizCompleted) {
        window.history.pushState(null, '', window.location.href);
        toast({
          title: 'Navigation Blocked',
          description: 'You cannot go back during the quiz.',
          variant: 'destructive',
        });
      }
    };

    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [quizCompleted]);

  const handleEditorMount = (editor: any) => {
    editor.onKeyDown((e: any) => {
      if ((e.ctrlKey || e.metaKey) && (e.keyCode === 67 || e.keyCode === 86)) {
        e.preventDefault();
        logCheatEvent('copy_paste_attempt', 'User attempted to copy/paste');
        toast({
          title: 'Copy/Paste Disabled',
          description: 'Copy and paste are disabled during the quiz.',
          variant: 'destructive',
        });
      }
    });
  };

  const fetchQuizData = async () => {
    if (!assignmentId || !user) return;

    const { data: assignmentData, error: assignmentError } = await supabase
      .from('quiz_assignments')
      .select('*')
      .eq('id', assignmentId)
      .eq('user_id', user.id)
      .single();

    if (assignmentError || !assignmentData) {
      toast({ title: 'Error', description: 'Assignment not found', variant: 'destructive' });
      navigate('/');
      return;
    }

    const typedAssignment = assignmentData as QuizAssignment;

    if (typedAssignment.is_completed) {
      setQuizCompleted(true);
      setAssignment(typedAssignment);
      await fetchResults();
      setLoading(false);
      return;
    }

    setAssignment(typedAssignment);

    const { data: quizData } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', typedAssignment.quiz_id)
      .single();

    if (quizData) {
      const typedQuiz = quizData as Quiz;
      setQuiz(typedQuiz);
      setTimeLeft(typedQuiz.time_per_question);
    }

    const { data: orderData } = await supabase
      .from('question_orders')
      .select('*, question:questions(*)')
      .eq('assignment_id', assignmentId)
      .order('order_index');

    if (orderData && orderData.length > 0) {
      const orderedQuestions = orderData
        .map((o: any) => o.question)
        .filter(Boolean) as Question[];
      setQuestions(orderedQuestions);
      
      const { data: submissions } = await supabase
        .from('submissions')
        .select('question_id')
        .eq('assignment_id', assignmentId);
      
      const answeredIds = new Set((submissions as any[] || []).map(s => s.question_id));
      const nextIndex = orderedQuestions.findIndex(q => !answeredIds.has(q.id));
      setCurrentQuestionIndex(nextIndex === -1 ? orderedQuestions.length : nextIndex);
      
      if (nextIndex === -1 || nextIndex >= orderedQuestions.length) {
        await completeQuiz();
      }
    } else {
      const { data: questionsData } = await supabase
        .from('questions')
        .select('*')
        .eq('quiz_id', typedAssignment.quiz_id);

      if (questionsData) {
        const shuffled = [...(questionsData as Question[])].sort(() => Math.random() - 0.5);
        setQuestions(shuffled);

        const orders = shuffled.map((q, idx) => ({
          assignment_id: assignmentId,
          question_id: q.id,
          order_index: idx,
        }));

        await supabase.from('question_orders').insert(orders);

        await supabase
          .from('quiz_assignments')
          .update({ started_at: new Date().toISOString() })
          .eq('id', assignmentId);
      }
    }

    if (currentQuestion) {
      setUserCode(currentQuestion.incorrect_code);
    }

    setLoading(false);
  };

  const fetchResults = async () => {
    if (!assignmentId) return;
    
    const { data: submissions } = await supabase
      .from('submissions')
      .select('is_correct')
      .eq('assignment_id', assignmentId);

    if (submissions) {
      const typedSubmissions = submissions as { is_correct: boolean }[];
      const correct = typedSubmissions.filter(s => s.is_correct).length;
      setResults({ correct, total: typedSubmissions.length });
    }
  };

  const logCheatEvent = async (eventType: string, details: string) => {
    if (!user || !assignmentId) return;
    
    await supabase.from('cheat_logs').insert([{
      user_id: user.id,
      assignment_id: assignmentId,
      event_type: eventType,
      details,
    }]);
  };

  const handleAutoSubmit = useCallback(() => {
    handleSubmitAnswer();
  }, []);

  const handleSubmitAnswer = async () => {
    if (!currentQuestion || !assignmentId || isSubmitting) return;
    
    setIsSubmitting(true);
    if (timerRef.current) clearInterval(timerRef.current);

    const timeTaken = Math.round((Date.now() - questionStartTime.current) / 1000);
    const isCorrect = normalizeCode(userCode) === normalizeCode(currentQuestion.correct_code);

    await supabase.from('submissions').insert([{
      assignment_id: assignmentId,
      question_id: currentQuestion.id,
      user_code: userCode,
      is_correct: isCorrect,
      time_taken: timeTaken,
    }]);

    setIsSubmitting(false);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      const nextQuestion = questions[currentQuestionIndex + 1];
      if (nextQuestion) {
        setUserCode(nextQuestion.incorrect_code);
      }
    } else {
      await completeQuiz();
    }
  };

  const completeQuiz = async () => {
    if (!assignmentId) return;

    await supabase
      .from('quiz_assignments')
      .update({
        is_completed: true,
        completed_at: new Date().toISOString(),
      })
      .eq('id', assignmentId);

    await fetchResults();
    setQuizCompleted(true);
  };

  useEffect(() => {
    if (currentQuestion) {
      setUserCode(currentQuestion.incorrect_code);
    }
  }, [currentQuestion]);

  if (loading) {
    return (
      <div className="dark min-h-screen bg-background obsidian-gradient flex items-center justify-center">
        <div className="text-primary font-mono animate-pulse">Loading quiz...</div>
      </div>
    );
  }

  if (quizCompleted) {
    return (
      <div className="dark min-h-screen bg-background obsidian-gradient flex items-center justify-center p-4">
        <div className="absolute inset-0 scanline pointer-events-none opacity-30" />
        <Card className="glass-effect border-primary/30 border-glow max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-4 rounded-full bg-primary/20 animate-pulse-glow">
              <CheckCircle className="w-12 h-12 text-primary" />
            </div>
            <CardTitle className="text-2xl font-mono text-foreground">
              Challenge Complete!
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            {results && (
              <div className="space-y-2">
                <p className="text-4xl font-bold text-primary font-mono text-glow">
                  {results.correct}/{results.total}
                </p>
                <p className="text-muted-foreground font-mono">
                  Questions Solved Correctly
                </p>
              </div>
            )}
            <Button onClick={() => navigate('/')} className="w-full font-mono bg-primary hover:bg-primary/90">
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="dark min-h-screen bg-background obsidian-gradient flex items-center justify-center">
        <div className="text-muted-foreground font-mono">No questions available</div>
      </div>
    );
  }

  const progressPercent = ((currentQuestionIndex + 1) / questions.length) * 100;
  const timerPercent = (timeLeft / (quiz?.time_per_question || 150)) * 100;

  return (
    <div className="dark min-h-screen bg-background obsidian-gradient flex flex-col">
      <div className="absolute inset-0 scanline pointer-events-none opacity-20" />
      
      <header className="border-b border-border/50 glass-effect sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bug className="w-6 h-6 text-primary" />
            <span className="font-mono text-foreground">{quiz?.title}</span>
            <Badge variant="outline" className="border-primary/30 text-primary">{quiz?.language.toUpperCase()}</Badge>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground font-mono">
              Question {currentQuestionIndex + 1}/{questions.length}
            </div>
            {tabSwitchCount > 0 && (
              <Badge variant="destructive" className="font-mono">
                <AlertTriangle className="w-3 h-3 mr-1" />
                {tabSwitchCount} warnings
              </Badge>
            )}
          </div>
        </div>
        <Progress value={progressPercent} className="h-1" />
      </header>

      <div className="glass-effect border-b border-border/30">
        <div className="container mx-auto px-4 py-2 flex items-center gap-4">
          <Clock className={`w-5 h-5 ${timeLeft <= 30 ? 'text-destructive animate-pulse' : 'text-primary'}`} />
          <div className="flex-1">
            <Progress 
              value={timerPercent} 
              className={`h-2 ${timeLeft <= 30 ? '[&>div]:bg-destructive' : ''}`}
            />
          </div>
          <span className={`font-mono text-lg font-bold ${timeLeft <= 30 ? 'text-destructive' : 'text-foreground'}`}>
            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
          </span>
        </div>
      </div>

      <main className="flex-1 container mx-auto px-4 py-4 flex flex-col relative z-10">
        <Card className="glass-effect border-border/50 mb-4">
          <CardHeader className="py-3">
            <CardTitle className="font-mono text-foreground text-lg">
              <span className="text-primary">&gt;</span> {currentQuestion.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <p className="text-sm text-muted-foreground font-mono">
              Expected output: <code className="bg-primary/10 px-2 py-1 rounded text-primary">{currentQuestion.expected_output}</code>
            </p>
          </CardContent>
        </Card>

        <div className="flex-1 min-h-[400px] rounded-lg overflow-hidden border border-primary/30 border-glow">
          <Editor
            height="100%"
            language={languageToMonaco[quiz?.language || 'javascript']}
            value={userCode}
            onChange={(value) => setUserCode(value || '')}
            onMount={handleEditorMount}
            theme="vs-dark"
            options={{
              fontSize: 14,
              fontFamily: 'JetBrains Mono, monospace',
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              padding: { top: 16, bottom: 16 },
              lineNumbers: 'on',
              renderLineHighlight: 'all',
              contextmenu: false,
            }}
          />
        </div>

        <div className="mt-4 flex justify-end">
          <Button
            onClick={handleSubmitAnswer}
            disabled={isSubmitting}
            className="font-mono min-w-40 bg-primary hover:bg-primary/90"
            size="lg"
          >
            {isSubmitting ? (
              'Submitting...'
            ) : currentQuestionIndex < questions.length - 1 ? (
              <>
                Next Question
                <ChevronRight className="w-4 h-4 ml-2" />
              </>
            ) : (
              'Finish Quiz'
            )}
          </Button>
        </div>
      </main>
    </div>
  );
}
