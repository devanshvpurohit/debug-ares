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
import { AlertTriangle, Clock, ChevronRight, Bug, CheckCircle, XCircle } from 'lucide-react';
import type { Quiz, Question, QuizAssignment, QuestionOrder, ProgrammingLanguage } from '@/types/database';

const languageToMonaco: Record<ProgrammingLanguage, string> = {
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
    .replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '') // Remove comments
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/\s*([{}();,])\s*/g, '$1') // Remove spaces around punctuation
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

  // Fetch quiz data
  useEffect(() => {
    if (assignmentId) {
      fetchQuizData();
    }
  }, [assignmentId]);

  // Timer effect
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

  // Anti-cheat: Tab visibility
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

  // Anti-cheat: Prevent back navigation
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
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

  // Anti-cheat: Prevent copy/paste in editor
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

    // Fetch assignment with quiz
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

    if (assignmentData.is_completed) {
      setQuizCompleted(true);
      setAssignment(assignmentData);
      await fetchResults();
      setLoading(false);
      return;
    }

    setAssignment(assignmentData);

    // Fetch quiz
    const { data: quizData } = await supabase
      .from('quizzes')
      .select('*')
      .eq('id', assignmentData.quiz_id)
      .single();

    if (quizData) {
      setQuiz(quizData);
      setTimeLeft(quizData.time_per_question);
    }

    // Check for existing question order or create new one
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
      
      // Find the first unanswered question
      const { data: submissions } = await supabase
        .from('submissions')
        .select('question_id')
        .eq('assignment_id', assignmentId);
      
      const answeredIds = new Set(submissions?.map(s => s.question_id) || []);
      const nextIndex = orderedQuestions.findIndex(q => !answeredIds.has(q.id));
      setCurrentQuestionIndex(nextIndex === -1 ? orderedQuestions.length : nextIndex);
      
      if (nextIndex === -1 || nextIndex >= orderedQuestions.length) {
        await completeQuiz();
      }
    } else {
      // Fetch and randomize questions
      const { data: questionsData } = await supabase
        .from('questions')
        .select('*')
        .eq('quiz_id', assignmentData.quiz_id);

      if (questionsData) {
        const shuffled = [...questionsData].sort(() => Math.random() - 0.5);
        setQuestions(shuffled);

        // Save question order
        const orders = shuffled.map((q, idx) => ({
          assignment_id: assignmentId,
          question_id: q.id,
          order_index: idx,
        }));

        await supabase.from('question_orders').insert(orders);

        // Mark as started
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
      const correct = submissions.filter(s => s.is_correct).length;
      setResults({ correct, total: submissions.length });
    }
  };

  const logCheatEvent = async (eventType: string, details: string) => {
    if (!user || !assignmentId) return;
    
    await supabase.from('cheat_logs').insert({
      user_id: user.id,
      assignment_id: assignmentId,
      event_type: eventType,
      details,
    });
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

    await supabase.from('submissions').insert({
      assignment_id: assignmentId,
      question_id: currentQuestion.id,
      user_code: userCode,
      is_correct: isCorrect,
      time_taken: timeTaken,
    });

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

  // Set initial code when question changes
  useEffect(() => {
    if (currentQuestion) {
      setUserCode(currentQuestion.incorrect_code);
    }
  }, [currentQuestion]);

  if (loading) {
    return (
      <div className="dark min-h-screen bg-background flex items-center justify-center">
        <div className="text-primary font-mono animate-pulse">Loading quiz...</div>
      </div>
    );
  }

  if (quizCompleted) {
    return (
      <div className="dark min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="terminal-bg border-primary/30 border-glow max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-4 rounded-full bg-primary/10">
              <CheckCircle className="w-12 h-12 text-primary" />
            </div>
            <CardTitle className="text-2xl font-mono text-foreground">
              Challenge Complete!
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            {results && (
              <div className="space-y-2">
                <p className="text-4xl font-bold text-primary font-mono">
                  {results.correct}/{results.total}
                </p>
                <p className="text-muted-foreground font-mono">
                  Questions Solved Correctly
                </p>
              </div>
            )}
            <Button onClick={() => navigate('/')} className="w-full font-mono">
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="dark min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground font-mono">No questions available</div>
      </div>
    );
  }

  const progressPercent = ((currentQuestionIndex + 1) / questions.length) * 100;
  const timerPercent = (timeLeft / (quiz?.time_per_question || 150)) * 100;

  return (
    <div className="dark min-h-screen bg-background flex flex-col">
      <div className="absolute inset-0 scanline pointer-events-none opacity-20" />
      
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bug className="w-6 h-6 text-primary" />
            <span className="font-mono text-foreground">{quiz?.title}</span>
            <Badge variant="outline">{quiz?.language.toUpperCase()}</Badge>
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

      {/* Timer Bar */}
      <div className="bg-card/30 border-b border-border/30">
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

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-4 flex flex-col">
        <Card className="terminal-bg border-border/50 mb-4">
          <CardHeader className="py-3">
            <CardTitle className="font-mono text-foreground text-lg">
              <span className="text-primary">&gt;</span> {currentQuestion.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <p className="text-sm text-muted-foreground font-mono">
              Expected output: <code className="bg-muted px-2 py-1 rounded">{currentQuestion.expected_output}</code>
            </p>
          </CardContent>
        </Card>

        <div className="flex-1 min-h-[400px] rounded-lg overflow-hidden border border-border/50">
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
            className="font-mono min-w-40"
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
