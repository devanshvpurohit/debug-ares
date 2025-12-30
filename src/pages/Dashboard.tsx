import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { Bug, Play, Trophy, Clock, Code2, LogOut, Settings, Terminal, Cpu, Zap, Binary } from 'lucide-react';

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  time_per_question: number;
  language: string;
  is_active: boolean;
}

interface QuizAssignment {
  id: string;
  quiz_id: string;
  user_id: string;
  is_completed: boolean;
  started_at: string | null;
  completed_at: string | null;
  quiz: Quiz;
}

const languageColors: Record<string, string> = {
  java: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  python: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  cpp: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  javascript: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  go: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  csharp: 'bg-matrix-green/20 text-matrix-green border-matrix-green/30',
  ruby: 'bg-red-500/20 text-red-400 border-red-500/30',
};

// Matrix rain background component
const MatrixBackground = () => {
  const columns = Array.from({ length: 15 }, (_, i) => i);
  const characters = 'アイウエオカキクケコサシスセソ0123456789';

  return (
    <div className="matrix-rain-container opacity-10">
      {columns.map((col) => (
        <div
          key={col}
          className="matrix-rain-column"
          style={{
            left: `${col * 7}%`,
            animationDuration: `${4 + Math.random() * 6}s`,
            animationDelay: `${Math.random() * 4}s`,
          }}
        >
          {Array.from({ length: 25 }, () =>
            characters.charAt(Math.floor(Math.random() * characters.length))
          ).join(' ')}
        </div>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const { user, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<QuizAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchAssignments();
    }
  }, [user]);

  const fetchAssignments = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('quiz_assignments')
      .select(`
        *,
        quiz:quizzes(*)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching assignments:', error);
    } else {
      setAssignments((data as QuizAssignment[]) || []);
    }
    setLoading(false);
  };

  const handleStartQuiz = (assignmentId: string) => {
    navigate(`/quiz/${assignmentId}`);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="dark min-h-screen bg-black matrix-bg relative overflow-hidden">
      {/* Matrix rain background */}
      <MatrixBackground />

      {/* Scanline overlay */}
      <div className="absolute inset-0 scanline pointer-events-none opacity-20" />

      {/* Floating matrix orbs */}
      <div className="absolute top-40 right-20 w-80 h-80 bg-matrix-green/5 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-40 left-20 w-64 h-64 bg-matrix-green/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />

      {/* Header */}
      <header className="border-b border-matrix-green/20 glass-effect sticky top-0 z-50 bg-black/80">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-black border border-matrix-green/50 border-glow animate-pulse-glow">
              <Bug className="w-6 h-6 text-matrix-green" />
            </div>
            <span className="text-xl font-bold text-matrix-green font-matrix tracking-wider text-glow">
              DEBUG<span className="text-white">_</span>ARENA
            </span>
          </div>

          <div className="flex items-center gap-4">
            {isAdmin && (
              <Button
                variant="outline"
                onClick={() => navigate('/admin')}
                className="font-mono border-matrix-green/30 hover:border-matrix-green hover:bg-matrix-green/10 text-matrix-green hover:text-matrix-green transition-all duration-300"
              >
                <Settings className="w-4 h-4 mr-2" />
                Admin Panel
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => navigate('/leaderboard')}
              className="font-mono border-matrix-green/30 hover:border-matrix-green hover:bg-matrix-green/10 text-matrix-green hover:text-matrix-green transition-all duration-300"
            >
              <Trophy className="w-4 h-4 mr-2" />
              Leaderboard
            </Button>
            <div className="text-sm text-matrix-green/60 font-mono hidden md:flex items-center gap-2">
              <Cpu className="w-4 h-4 animate-pulse" />
              {user?.email}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSignOut}
              className="hover:bg-matrix-green/10 text-matrix-green hover:text-matrix-green-light transition-all duration-300"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 relative z-10">
        <div className="mb-8 animate-fade-in-up">
          <div className="flex items-center gap-2 text-matrix-green/70 font-mono text-xs mb-2">
            <Terminal className="w-4 h-4" />
            <span className="animate-blink">▌</span>
            <span>CHALLENGE_DASHBOARD</span>
          </div>
          <h1 className="text-3xl font-bold text-matrix-green mb-2 font-matrix tracking-wide text-glow">
            <span className="text-white">{'>'}</span> Your Challenges
          </h1>
          <p className="text-matrix-green/60 font-mono text-sm flex items-center gap-2">
            <Binary className="w-4 h-4" />
            Debug the code. Beat the clock. Climb the ranks.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-matrix-green font-mono flex items-center gap-3 text-glow">
              <Zap className="w-6 h-6 animate-pulse" />
              <span className="animate-pulse">Loading challenges...</span>
            </div>
          </div>
        ) : assignments.length === 0 ? (
          <Card className="glass-effect border-matrix-green/20 bg-black/80 cyber-border animate-fade-in-up">
            <CardContent className="flex flex-col items-center justify-center py-20">
              <div className="p-4 rounded-xl bg-black border border-matrix-green/30 border-glow mb-6">
                <Code2 className="w-16 h-16 text-matrix-green/50" />
              </div>
              <h3 className="text-xl font-semibold text-matrix-green mb-2 font-matrix tracking-wide">
                No Challenges Assigned
              </h3>
              <p className="text-matrix-green/50 text-center font-mono text-sm">
                [AWAITING] Wait for an admin to assign you a debugging challenge.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {assignments.map((assignment, index) => (
              <Card
                key={assignment.id}
                className="glass-effect border-matrix-green/20 hover:border-matrix-green/60 transition-all duration-500 group hover:shadow-lg hover:shadow-matrix-green/20 bg-black/80 cyber-border animate-fade-in-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <Badge
                      variant="outline"
                      className={languageColors[assignment.quiz.language] || 'bg-matrix-green/20 text-matrix-green border-matrix-green/30'}
                    >
                      {assignment.quiz.language.toUpperCase()}
                    </Badge>
                    {assignment.is_completed && (
                      <Badge variant="secondary" className="bg-matrix-green/20 text-matrix-green border-matrix-green/30 font-mono">
                        ✓ Completed
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-matrix-green font-matrix mt-2 group-hover:text-matrix-green-light transition-colors tracking-wide text-glow">
                    {assignment.quiz.title}
                  </CardTitle>
                  <CardDescription className="text-matrix-green/50 font-mono">
                    {assignment.quiz.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-matrix-green/60 mb-4 font-mono">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {assignment.quiz.time_per_question}s/question
                    </div>
                  </div>

                  {!assignment.is_completed ? (
                    <Button
                      className="w-full font-mono bg-matrix-green hover:bg-matrix-green-light text-black font-bold tracking-wider transition-all duration-300 group-hover:shadow-md group-hover:shadow-matrix-green/30"
                      onClick={() => handleStartQuiz(assignment.id)}
                    >
                      <Play className="w-4 h-4 mr-2" />
                      {assignment.started_at ? 'CONTINUE CHALLENGE' : 'START CHALLENGE'}
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full font-mono border-matrix-green/30 text-matrix-green hover:bg-matrix-green/10"
                      disabled
                    >
                      <span className="flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        Challenge Completed
                      </span>
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-matrix-green/10 py-4 mt-8 relative z-10">
        <div className="container mx-auto px-4 text-center">
          <p className="text-matrix-green/30 text-xs font-mono tracking-widest">
            {'</>'}DEBUG ARENA v2.0 | <span className="text-matrix-green/50">MATRIX</span> EDITION{'</>'}
          </p>
        </div>
      </footer>
    </div>
  );
}
