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

  // Execution state
  const [output, setOutput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);

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

    await supabase.from('cheat_logs').insert({
      user_id: user.id,
      assignment_id: assignmentId,
      event_type: eventType,
      details,
    });
  };

  const handleRunCode = async () => {
    if (!currentQuestion || isExecuting) return;
    setIsExecuting(true);
    setOutput('> Executing code...\n');

    try {
      const language = quiz?.language || 'javascript';
      const version = {
        'javascript': '18.15.0',
        'python': '3.10.0',
        'java': '17.0.2',
        'cpp': '10.2.0',
        'go': '1.16.2',
        'csharp': '5.0.201',
        'ruby': '3.0.1'
      }[language] || '18.15.0';

      const response = await fetch('https://emkc.org/api/v2/piston/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language,
          version,
          files: [{ content: userCode }]
        })
      });

      const data = await response.json();
      if (data.run) {
        const runOutput = (data.run.stdout || '') + (data.run.stderr || '');
        setOutput(runOutput);

        // Visual feedback if it matches expected output
        if (runOutput.trim() === currentQuestion.expected_output?.trim()) {
          toast({
            title: "Output Match!",
            description: "Your code produced the expected output.",
            className: "bg-matrix-green border-matrix-green text-black"
          });
        }
      }
    } catch (error) {
      setOutput('Error connecting to execution environment.');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleAutoSubmit = useCallback(() => {
    handleSubmitAnswer();
  }, []);

  const handleSubmitAnswer = async () => {
    if (!currentQuestion || !assignmentId || isSubmitting) return;

    setIsSubmitting(true);
    if (timerRef.current) clearInterval(timerRef.current);

    const timeTaken = Math.round((Date.now() - questionStartTime.current) / 1000);

    // First try output match, fallback to code match
    let isCorrect = false;

    // Attempt output verification via API if expected output is provided
    if (currentQuestion.expected_output) {
      try {
        const language = quiz?.language || 'javascript';
        const version = {
          'javascript': '18.15.0',
          'python': '3.10.0',
          'java': '17.0.2',
          'cpp': '10.2.0',
          'go': '1.16.2',
          'csharp': '5.0.201',
          'ruby': '3.0.1'
        }[language] || '18.15.0';

        const response = await fetch('https://emkc.org/api/v2/piston/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            language,
            version,
            files: [{ content: userCode }]
          })
        });

        const data = await response.json();
        if (data.run && data.run.stdout?.trim() === currentQuestion.expected_output.trim()) {
          isCorrect = true;
        }
      } catch (e) {
        // Fallback to strict code match if API fails
        isCorrect = normalizeCode(userCode) === normalizeCode(currentQuestion.correct_code);
      }
    } else {
      isCorrect = normalizeCode(userCode) === normalizeCode(currentQuestion.correct_code);
    }

    await (supabase.from('submissions') as any).insert([{
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

    await (supabase.from('quiz_assignments') as any)
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
      setOutput(''); // Reset output for next question
    }
  }, [currentQuestion]);

  if (loading) {
    return (
      <div className="dark min-h-screen bg-black matrix-bg flex items-center justify-center">
        <div className="text-matrix-green font-mono animate-pulse text-glow">Loading quiz...</div>
      </div>
    );
  }

  if (quizCompleted) {
    return (
      <div className="dark min-h-screen bg-black matrix-bg flex items-center justify-center p-4">
        <div className="absolute inset-0 scanline pointer-events-none opacity-20" />
        <Card className="glass-effect border-matrix-green/30 border-glow max-w-md w-full bg-black/90 cyber-border">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-4 rounded-full bg-matrix-green/20 animate-pulse-glow border border-matrix-green/50">
              <CheckCircle className="w-12 h-12 text-matrix-green" />
            </div>
            <CardTitle className="text-2xl font-matrix text-matrix-green text-glow tracking-wide">
              Challenge Complete!
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            {results && (
              <div className="space-y-2">
                <p className="text-4xl font-bold text-matrix-green font-matrix text-glow-intense">
                  {results.correct}/{results.total}
                </p>
                <p className="text-matrix-green/60 font-mono">
                  Questions Solved Correctly
                </p>
              </div>
            )}
            <Button onClick={() => navigate('/')} className="w-full font-mono bg-matrix-green hover:bg-matrix-green-light text-black font-bold">
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="dark min-h-screen bg-black matrix-bg flex items-center justify-center">
        <div className="text-matrix-green/50 font-mono">No questions available</div>
      </div>
    );
  }

  const progressPercent = ((currentQuestionIndex + 1) / questions.length) * 100;
  const timerPercent = (timeLeft / (quiz?.time_per_question || 150)) * 100;

  return (
    <div className="dark min-h-screen bg-black matrix-bg flex flex-col">
      <div className="absolute inset-0 scanline pointer-events-none opacity-20" />

      <header className="border-b border-matrix-green/20 glass-effect sticky top-0 z-50 bg-black/80">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bug className="w-6 h-6 text-matrix-green" />
            <span className="font-mono text-matrix-green">{quiz?.title}</span>
            <Badge variant="outline" className="border-matrix-green/30 text-matrix-green">{quiz?.language.toUpperCase()}</Badge>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-sm text-matrix-green/60 font-mono">
              Question {currentQuestionIndex + 1}/{questions.length}
            </div>
            {tabSwitchCount > 0 && (
              <Badge variant="destructive" className="font-mono bg-red-500/20 text-red-400 border-red-500/30">
                <AlertTriangle className="w-3 h-3 mr-1" />
                {tabSwitchCount} warnings
              </Badge>
            )}
          </div>
        </div>
        <Progress value={progressPercent} className="h-1" />
      </header>

      <div className="glass-effect border-b border-matrix-green/20 bg-black/80">
        <div className="container mx-auto px-4 py-2 flex items-center gap-4">
          <Clock className={`w-5 h-5 ${timeLeft <= 30 ? 'text-red-400 animate-pulse' : 'text-matrix-green'}`} />
          <div className="flex-1">
            <Progress
              value={timerPercent}
              className={`h-2 ${timeLeft <= 30 ? '[&>div]:bg-red-500' : '[&>div]:bg-matrix-green'}`}
            />
          </div>
          <span className={`font-mono text-lg font-bold ${timeLeft <= 30 ? 'text-red-400' : 'text-matrix-green text-glow'}`}>
            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
          </span>
        </div>
      </div>

      <main className="flex-1 container mx-auto px-4 py-4 flex flex-col relative z-10">
        <Card className="glass-effect border-matrix-green/20 mb-4 bg-black/80 cyber-border">
          <CardHeader className="py-3">
            <CardTitle className="font-mono text-matrix-green text-lg text-glow">
              <span className="text-white">&gt;</span> {currentQuestion.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <p className="text-sm text-matrix-green/60 font-mono">
              Expected output: <code className="bg-matrix-green/10 px-2 py-1 rounded text-matrix-green border border-matrix-green/30">{currentQuestion.expected_output}</code>
            </p>
          </CardContent>
        </Card>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-[400px]">
          {/* Editor - 3/4 Width */}
          <div className="lg:col-span-3 flex flex-col rounded-lg overflow-hidden border border-matrix-green/30 border-glow bg-black">
            <div className="bg-black/80 border-b border-matrix-green/20 px-4 py-2 flex items-center justify-between">
              <span className="text-xs font-mono text-matrix-green/60 uppercase">main.{languageToMonaco[quiz?.language || 'javascript'] === 'python' ? 'py' : 'code'}</span>
              <div className="flex gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500/30" />
                <div className="w-2 h-2 rounded-full bg-yellow-500/30" />
                <div className="w-2 h-2 rounded-full bg-matrix-green/30" />
              </div>
            </div>
            <div className="flex-1">
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
                  cursorSmoothCaretAnimation: 'on',
                  smoothScrolling: true,
                }}
              />
            </div>
          </div>

          {/* Console - 1/4 Width */}
          <div className="lg:col-span-1 flex flex-col glass-effect border border-matrix-green/20 bg-black/80 rounded-lg overflow-hidden cyber-border">
            <div className="border-b border-matrix-green/10 px-3 py-2 flex items-center gap-2 bg-black/40">
              <Terminal className="w-3 h-3 text-matrix-green" />
              <span className="text-[10px] font-matrix text-matrix-green tracking-widest uppercase">Console_Output</span>
            </div>
            <div className="flex-1 p-3 font-mono text-xs overflow-auto text-matrix-green whitespace-pre-wrap bg-black/20">
              {output || <span className="text-matrix-green/20">No output. Run code to verify.</span>}
              {isExecuting && <span className="inline-block w-1.5 h-3.5 bg-matrix-green ml-1 animate-blink" />}
            </div>
            <div className="p-2 border-t border-matrix-green/10 bg-black/40">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRunCode}
                disabled={isExecuting || isSubmitting}
                className="w-full text-xs font-mono border-matrix-green/30 text-matrix-green hover:bg-matrix-green/20 h-8"
              >
                {isExecuting ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <Play className="w-3 h-3 mr-2" />}
                RUN_ANALYSIS
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-3">
          <Button
            onClick={handleSubmitAnswer}
            disabled={isSubmitting || isExecuting}
            className="font-mono min-w-48 bg-matrix-green hover:bg-matrix-green-light text-black font-bold transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,255,65,0.5)]"
            size="lg"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : currentQuestionIndex < questions.length - 1 ? (
              <>
                Finalize & Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </>
            ) : (
              'Terminate Challenge'
            )}
          </Button>
        </div>
      </main>
    </div>
  );
}
