import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { Bug, Play, Trophy, Clock, Code2, LogOut, Settings } from 'lucide-react';

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
  csharp: 'bg-green-500/20 text-green-400 border-green-500/30',
  ruby: 'bg-red-500/20 text-red-400 border-red-500/30',
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
    <div className="dark min-h-screen bg-background obsidian-gradient">
      <div className="absolute inset-0 scanline pointer-events-none opacity-30" />
      
      {/* Floating orbs */}
      <div className="absolute top-40 right-20 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-40 left-20 w-64 h-64 bg-accent/10 rounded-full blur-3xl" />
      
      {/* Header */}
      <header className="border-b border-border/50 glass-effect sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20 border border-primary/30">
              <Bug className="w-6 h-6 text-primary" />
            </div>
            <span className="text-xl font-bold text-foreground font-mono">
              DEBUG<span className="text-primary">_</span>ARENA
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            {isAdmin && (
              <Button
                variant="outline"
                onClick={() => navigate('/admin')}
                className="font-mono border-primary/30 hover:border-primary hover:bg-primary/10"
              >
                <Settings className="w-4 h-4 mr-2" />
                Admin Panel
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => navigate('/leaderboard')}
              className="font-mono border-primary/30 hover:border-primary hover:bg-primary/10"
            >
              <Trophy className="w-4 h-4 mr-2" />
              Leaderboard
            </Button>
            <div className="text-sm text-muted-foreground font-mono hidden md:block">
              {user?.email}
            </div>
            <Button variant="ghost" size="icon" onClick={handleSignOut} className="hover:bg-primary/10">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 relative z-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2 font-mono">
            <span className="text-primary">&gt;</span> Your Challenges
          </h1>
          <p className="text-muted-foreground font-mono text-sm">
            Debug the code. Beat the clock. Climb the ranks.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-primary font-mono animate-pulse">
              Loading challenges...
            </div>
          </div>
        ) : assignments.length === 0 ? (
          <Card className="glass-effect border-border/50">
            <CardContent className="flex flex-col items-center justify-center py-20">
              <Code2 className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2 font-mono">
                No Challenges Assigned
              </h3>
              <p className="text-muted-foreground text-center font-mono text-sm">
                Wait for an admin to assign you a debugging challenge.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {assignments.map((assignment) => (
              <Card
                key={assignment.id}
                className="glass-effect border-border/50 hover:border-primary/50 transition-all duration-300 group hover:shadow-lg hover:shadow-primary/10"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <Badge
                      variant="outline"
                      className={languageColors[assignment.quiz.language] || 'bg-primary/20 text-primary border-primary/30'}
                    >
                      {assignment.quiz.language.toUpperCase()}
                    </Badge>
                    {assignment.is_completed && (
                      <Badge variant="secondary" className="bg-success/20 text-success border-success/30">
                        Completed
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-foreground font-mono mt-2 group-hover:text-primary transition-colors">
                    {assignment.quiz.title}
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    {assignment.quiz.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4 font-mono">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {assignment.quiz.time_per_question}s/question
                    </div>
                  </div>
                  
                  {!assignment.is_completed ? (
                    <Button
                      className="w-full font-mono bg-primary hover:bg-primary/90 group-hover:shadow-md group-hover:shadow-primary/20"
                      onClick={() => handleStartQuiz(assignment.id)}
                    >
                      <Play className="w-4 h-4 mr-2" />
                      {assignment.started_at ? 'Continue Challenge' : 'Start Challenge'}
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full font-mono border-success/30 text-success hover:bg-success/10"
                      disabled
                    >
                      Challenge Completed
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
