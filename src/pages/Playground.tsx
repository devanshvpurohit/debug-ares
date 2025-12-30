import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import {
    ArrowLeft, Play, Terminal, Code2, Cpu, Zap, Binary,
    Trash2, Copy, CheckCircle, XCircle, Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type Language = 'javascript' | 'python' | 'java' | 'cpp' | 'go' | 'csharp' | 'ruby';

const LANGUAGES: { value: Language; label: string; monacoLang: string; version: string }[] = [
    { value: 'javascript', label: 'JavaScript', monacoLang: 'javascript', version: '18.15.0' },
    { value: 'python', label: 'Python', monacoLang: 'python', version: '3.10.0' },
    { value: 'java', label: 'Java', monacoLang: 'java', version: '17.0.2' },
    { value: 'cpp', label: 'C++', monacoLang: 'cpp', version: '10.2.0' },
    { value: 'go', label: 'Go', monacoLang: 'go', version: '1.16.2' },
    { value: 'csharp', label: 'C#', monacoLang: 'csharp', version: '5.0.201' },
    { value: 'ruby', label: 'Ruby', monacoLang: 'ruby', version: '3.0.1' },
];

const CODE_TEMPLATES: Record<Language, string> = {
    javascript: 'console.log("Hello, Matrix!");\n\n// Try some math\nconst sum = 21 + 21;\nconsole.log(`The answer to everything is: ${sum}`);',
    python: 'print("Hello, Matrix!")\n\n# Try a loop\nfor i in range(5):\n    print(f"Loop index: {i}")',
    java: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, Matrix!");\n    }\n}',
    cpp: '#include <iostream>\n\nint main() {\n    std::cout << "Hello, Matrix!" << std::endl;\n    return 0;\n}',
    go: 'package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, Matrix!")\n}',
    csharp: 'using System;\n\nclass Program {\n    static void Main() {\n        Console.WriteLine("Hello, Matrix!");\n    }\n}',
    ruby: 'puts "Hello, Matrix!"\n\n# Simple method\ndef greet(name)\n  "Greetings, #{name}"\nend\n\nputs greet("Neo")',
};

export default function Playground() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [language, setLanguage] = useState<Language>('javascript');
    const [code, setCode] = useState(CODE_TEMPLATES.javascript);
    const [output, setOutput] = useState('');
    const [isRunning, setIsRunning] = useState(false);
    const [executionTime, setExecutionTime] = useState<number | null>(null);

    const handleRunCode = async () => {
        setIsRunning(true);
        setOutput('> Initializing execution environment...\n');
        const startTime = performance.now();

        try {
            const selectedLang = LANGUAGES.find(l => l.value === language);
            const response = await fetch('https://emkc.org/api/v2/piston/execute', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    language: language,
                    version: selectedLang?.version,
                    files: [
                        {
                            content: code,
                        },
                    ],
                }),
            });

            const data = await response.json();
            const endTime = performance.now();
            setExecutionTime(Math.round(endTime - startTime));

            if (data.run) {
                if (data.run.stderr) {
                    setOutput(data.run.stderr);
                    toast({
                        title: 'Execution Error',
                        description: 'Your code compiled but ran into an error.',
                        variant: 'destructive',
                    });
                } else {
                    setOutput(data.run.output || 'Code executed successfully with no output.');
                    toast({
                        title: 'Execution Complete',
                        description: 'Successfully ran your code in the matrix.',
                    });
                }
            } else {
                setOutput('Error: Could not execute code. Please try again.');
            }
        } catch (error) {
            console.error('Execution error:', error);
            setOutput('Connection Error: Failed to reach the execution bridge.');
        } finally {
            setIsRunning(false);
        }
    };

    const handleLanguageChange = (val: Language) => {
        setLanguage(val);
        setCode(CODE_TEMPLATES[val]);
        setOutput('');
        setExecutionTime(null);
    };

    const clearOutput = () => {
        setOutput('');
        setExecutionTime(null);
    };

    const copyCode = () => {
        navigator.clipboard.writeText(code);
        toast({ title: 'Copied', description: 'Code copied to clipboard' });
    };

    return (
        <div className="dark min-h-screen bg-black matrix-bg relative overflow-hidden flex flex-col">
            <div className="absolute inset-0 scanline pointer-events-none opacity-20" />

            {/* Header */}
            <header className="border-b border-matrix-green/20 glass-effect bg-black/80 z-20">
                <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="hover:bg-matrix-green/10 text-matrix-green">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-black border border-matrix-green/50 border-glow animate-pulse-glow">
                                <Code2 className="w-6 h-6 text-matrix-green" />
                            </div>
                            <div>
                                <span className="text-xl font-bold text-matrix-green font-matrix tracking-wider text-glow">
                                    CODE<span className="text-white">_</span>SANDBOX
                                </span>
                                <div className="flex items-center gap-2 text-matrix-green/50 text-xs font-mono">
                                    <Terminal className="w-3 h-3" />
                                    <span>Isolated Execution Environment</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Select value={language} onValueChange={(v) => handleLanguageChange(v as Language)}>
                            <SelectTrigger className="w-[180px] bg-black border-matrix-green/30 text-matrix-green font-mono">
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
                        <Button
                            onClick={handleRunCode}
                            disabled={isRunning}
                            className="font-mono bg-matrix-green hover:bg-matrix-green-light text-black font-bold shadow-[0_0_15px_rgba(0,255,65,0.3)]"
                        >
                            {isRunning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                            EXECUTE
                        </Button>
                    </div>
                </div>
            </header>

            <main className="flex-1 container mx-auto px-4 py-6 flex flex-col md:flex-row gap-6 relative z-10 overflow-hidden">
                {/* Editor Side */}
                <div className="flex-1 flex flex-col min-h-[400px]">
                    <div className="flex items-center justify-between bg-black/50 border border-matrix-green/20 p-2 rounded-t-lg">
                        <div className="flex items-center gap-2">
                            <div className="flex gap-1.5 px-2">
                                <div className="w-3 h-3 rounded-full bg-red-500/50" />
                                <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                                <div className="w-3 h-3 rounded-full bg-matrix-green/50" />
                            </div>
                            <span className="text-xs font-mono text-matrix-green/70">main.{language === 'javascript' ? 'js' : language === 'python' ? 'py' : language === 'cpp' ? 'cpp' : language === 'java' ? 'java' : language === 'go' ? 'go' : language === 'csharp' ? 'cs' : 'rb'}</span>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="ghost" size="icon" onClick={copyCode} className="h-7 w-7 text-matrix-green/50 hover:text-matrix-green hover:bg-matrix-green/10">
                                <Copy className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setCode('')} className="h-7 w-7 text-matrix-green/50 hover:text-red-400 hover:bg-red-400/10">
                                <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                        </div>
                    </div>
                    <div className="flex-1 border-x border-b border-matrix-green/20 rounded-b-lg overflow-hidden shadow-[0_0_30px_rgba(0,255,65,0.05)]">
                        <Editor
                            height="100%"
                            language={LANGUAGES.find(l => l.value === language)?.monacoLang}
                            value={code}
                            onChange={(v) => setCode(v || '')}
                            theme="vs-dark"
                            options={{
                                fontSize: 14,
                                fontFamily: 'JetBrains Mono, monospace',
                                minimap: { enabled: false },
                                scrollBeyondLastLine: false,
                                padding: { top: 16, bottom: 16 },
                                lineNumbers: 'on',
                                renderLineHighlight: 'all',
                                cursorSmoothCaretAnimation: 'on',
                                smoothScrolling: true,
                            }}
                        />
                    </div>
                </div>

                {/* Output Side */}
                <div className="w-full md:w-[400px] flex flex-col gap-4">
                    <Card className="flex-1 glass-effect border-matrix-green/20 bg-black/80 flex flex-col overflow-hidden cyber-border">
                        <CardHeader className="py-3 border-b border-matrix-green/10 flex flex-row items-center justify-between space-y-0">
                            <CardTitle className="text-sm font-matrix text-matrix-green flex items-center gap-2">
                                <Terminal className="w-4 h-4" />
                                OUTPUT_STREAM
                            </CardTitle>
                            {executionTime && (
                                <span className="text-[10px] font-mono text-matrix-green/40">
                                    Time: {executionTime}ms
                                </span>
                            )}
                        </CardHeader>
                        <CardContent className="flex-1 p-0 overflow-hidden flex flex-col">
                            <div className="flex-1 p-4 font-mono text-sm overflow-auto whitespace-pre-wrap bg-black/40 text-matrix-green selection:bg-matrix-green/20">
                                {output || <span className="text-matrix-green/30 italic">No output yet. Click EXECUTE to run your code.</span>}
                                {isRunning && <span className="inline-block w-2 h-4 bg-matrix-green ml-1 animate-blink" />}
                            </div>
                            <div className="p-2 border-t border-matrix-green/10 bg-black/60 flex justify-between items-center text-[10px] font-mono text-matrix-green/50">
                                <div className="flex items-center gap-4">
                                    <span className="flex items-center gap-1">
                                        <Zap className="w-3 h-3" /> READY
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Binary className="w-3 h-3" /> x64_OS
                                    </span>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={clearOutput}
                                    className="h-6 px-2 text-[10px] text-matrix-green/40 hover:text-matrix-green hover:bg-matrix-green/10"
                                >
                                    CLEAR
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="glass-effect border-matrix-green/20 bg-black/80 cyber-border">
                        <CardContent className="p-4">
                            <h4 className="text-xs font-matrix text-matrix-green mb-2 opacity-70">SYSTEM_TIPS</h4>
                            <ul className="text-[10px] font-mono text-matrix-green/50 space-y-1.5">
                                <li className="flex gap-2">
                                    <span className="text-matrix-green">/</span> Use console.log or print to see results in the output window.
                                </li>
                                <li className="flex gap-2">
                                    <span className="text-matrix-green">/</span> The execution environment is isolated and has no internet access.
                                </li>
                                <li className="flex gap-2">
                                    <span className="text-matrix-green">/</span> Output is capped at 1000 lines for system stability.
                                </li>
                            </ul>
                        </CardContent>
                    </Card>
                </div>
            </main>

            <footer className="border-t border-matrix-green/10 py-3 relative z-10">
                <div className="container mx-auto px-4 flex justify-between items-center">
                    <p className="text-matrix-green/30 text-[10px] font-mono tracking-widest uppercase">
                        {'</>'} Matrix Execution Bridge v4.2.0 {'</>'}
                    </p>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-matrix-green animate-pulse" />
                            <span className="text-[9px] font-mono text-matrix-green/50 tracking-wider">BRIDGE_CONNECTED</span>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
