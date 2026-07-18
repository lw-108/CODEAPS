import { Icons } from './FileIcons';

export interface LanguageConfig {
  id: string;
  label: string;
  monacoId: string;
  icon: any; // React.ReactNode equivalent in .ts
  color: string;
  runCommand?: (filePath: string) => string;
  isPreview?: boolean;
  template?: string;
}

const isWindows = typeof window !== 'undefined' && (navigator.userAgent.includes('Windows') || true);

const getOutputPath = (filePath: string, _ext: string) => {
  const base = filePath.replace(/\.[^.]+$/, '');
  return isWindows ? `${base}.exe` : base;
};

const getDir = (f: string) => {
  const lastIdx = Math.max(f.lastIndexOf('\\'), f.lastIndexOf('/'));
  return lastIdx === -1 ? '.' : f.substring(0, lastIdx);
};

export const LANGUAGE_MAP: Record<string, LanguageConfig> = {
  c: {
    id: 'c', label: 'C', monacoId: 'c', color: '#5C6BC0',
    icon: Icons.C,
    runCommand: (f) => `cd "${getDir(f)}"; gcc "${f}" -o "${getOutputPath(f, '')}"; if ($?) { & "${getOutputPath(f, '')}" }`,
    template: `#include <stdio.h>\n\nint main() {\n    printf("CodeAps Neural Engine Active\\n");\n    return 0;\n}\n`
  },
  cpp: {
    id: 'cpp', label: 'C++', monacoId: 'cpp', color: '#00599C',
    icon: Icons.Cpp,
    runCommand: (f) => `cd "${getDir(f)}"; g++ "${f}" -o "${getOutputPath(f, '')}"; if ($?) { & "${getOutputPath(f, '')}" }`,
    template: `#include <iostream>\n\nint main() {\n    std::cout << "CodeAps Neural Engine Active" << std::endl;\n    return 0;\n}\n`
  },
  java: {
    id: 'java', label: 'Java', monacoId: 'java', color: '#ED8B00',
    icon: Icons.Java,
    runCommand: (f) => {
      const className = f.replace(/\.[^.]+$/, '').split(/[\\/]/).pop();
      const dir = getDir(f);
      return `cd "${dir}"; javac "${f}"; if ($?) { java ${className} }`;
    },
    template: `public class Main {\n    public static void main(String[] args) {\n        System.out.println("CodeAps Neural Engine Active");\n    }\n}\n`
  },
  py: {
    id: 'python', label: 'Python', monacoId: 'python', color: '#3776AB',
    icon: Icons.Python,
    runCommand: (f) => `cd "${getDir(f)}"; python "${f}"`,
    template: `def main():\n    print("CodeAps Neural Engine Active")\n\nif __name__ == "__main__":\n    main()\n`
  },
  js: {
    id: 'javascript', label: 'JavaScript', monacoId: 'javascript', color: '#F7DF1E',
    icon: Icons.JS,
    runCommand: (f) => `cd "${getDir(f)}"; node "${f}"`,
    template: `console.log("CodeAps Neural Engine Active");\n`
  },
  jsx: {
    id: 'javascriptreact', label: 'React', monacoId: 'javascript', color: '#61DAFB',
    icon: Icons.React,
    runCommand: (f) => `cd "${getDir(f)}"; node "${f}"`,
    template: `import React from 'react';\n\nexport const App = () => {\n  return React.createElement('div', null, 'CodeAps Neural Engine Active');\n};\n`
  },
  ts: {
    id: 'typescript', label: 'TypeScript', monacoId: 'typescript', color: '#3178C6',
    icon: Icons.TS,
    runCommand: (f) => `cd "${getDir(f)}"; npx ts-node "${f}"`,
    template: `const message: string = "CodeAps Neural Engine Active";\nconsole.log(message);\n`
  },
  tsx: {
    id: 'typescriptreact', label: 'React TSX', monacoId: 'typescript', color: '#3178C6',
    icon: Icons.ReactTS,
    runCommand: (f) => `cd "${getDir(f)}"; npx ts-node "${f}"`,
    template: `import React from 'react';\n\ninterface AppProps {}\n\nexport const App: React.FC<AppProps> = () => {\n  return React.createElement('div', null, 'CodeAps Neural Engine Active');\n};\n`
  },
  rs: {
    id: 'rust', label: 'Rust', monacoId: 'rust', color: '#DEA584',
    icon: Icons.Rust,
    runCommand: (f) => `cd "${getDir(f)}"; rustc "${f}" -o "${getOutputPath(f, '')}"; if ($?) { & "${getOutputPath(f, '')}" }`,
    template: `fn main() {\n    println!("CodeAps Neural Engine Active");\n}\n`
  },
  go: {
    id: 'go', label: 'Go', monacoId: 'go', color: '#00ADD8',
    icon: Icons.Go,
    runCommand: (f) => `cd "${getDir(f)}"; go run "${f}"`,
    template: `package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("CodeAps Neural Engine Active")\n}\n`
  },
  php: {
    id: 'php', label: 'PHP', monacoId: 'php', color: '#777BB4',
    icon: Icons.PHP,
    runCommand: (f) => `php "${f}"`,
    template: `<?php\necho "CodeAps Neural Engine Active\\n";\n`
  },
  rb: {
    id: 'ruby', label: 'Ruby', monacoId: 'ruby', color: '#CC342D',
    icon: Icons.Ruby,
    runCommand: (f) => `ruby "${f}"`,
    template: `puts "CodeAps Neural Engine Active"\n`
  },
  cs: {
    id: 'csharp', label: 'C#', monacoId: 'csharp', color: '#239120',
    icon: Icons.CSharp,
    runCommand: (f) => `cd "${getDir(f)}"; dotnet run "${f}"`,
    template: `using System;\n\nclass Program {\n    static void main() {\n        Console.WriteLine("CodeAps Neural Engine Active");\n    }\n}\n`
  },
  sh: {
    id: 'shell', label: 'Shell', monacoId: 'shell', color: '#89E051',
    icon: Icons.Shell,
    runCommand: (f) => `bash "${f}"`,
    template: `#!/bin/bash\necho "CodeAps Neural Engine Active"\n`
  },
  ps1: {
    id: 'powershell', label: 'PowerShell', monacoId: 'powershell', color: '#012456',
    icon: Icons.Shell,
    runCommand: (f) => `powershell -ExecutionPolicy Bypass -File "${f}"`,
    template: `Write-Host "CodeAps Neural Engine Active"\n`
  },
  sql: {
    id: 'sql', label: 'SQL', monacoId: 'sql', color: '#336791',
    icon: Icons.Fallback('sql'),
    runCommand: (f) => `Write-Host "Direct SQL execution requires a connected database instance for: ${f}"`
  },
  html: {
    id: 'html', label: 'HTML', monacoId: 'html', color: '#E34C26',
    isPreview: true,
    icon: Icons.HTML,
    runCommand: (f) => `Start-Process "${f}"`,
    template: `<!DOCTYPE html>\n<html>\n<head>\n    <title>CodeAps Preview</title>\n</head>\n<body>\n    <h1>CodeAps Neural Engine Active</h1>\n</body>\n</html>\n`
  },
  json: {
    id: 'json', label: 'JSON', monacoId: 'json', color: '#F5C518',
    icon: Icons.JSON,
    runCommand: (f) => `Write-Host "No execution for JSON: ${f}"`
  },
  css: {
    id: 'css', label: 'CSS', monacoId: 'css', color: '#264DE4',
    icon: Icons.Fallback('css'),
    runCommand: (f) => `Write-Host "No execution for CSS: ${f}"`
  },
};


export function getLanguageFromExtension(filename: string): LanguageConfig {
  const sanitized = (filename || '').trim().toLowerCase();
  
  // High-priority settings icon override
  if (
    sanitized === 'settings' || 
    sanitized === 'settings.json' || 
    sanitized === 'settings.yaml' || 
    sanitized === 'tauri.conf.json' || 
    sanitized.includes('.settings') ||
    sanitized === '__settings__'
  ) {
    return {
      id: 'settings',
      label: 'Settings',
      monacoId: 'json',
      color: '#F5C518',
      icon: Icons.Settings
    };
  }

  const ext = sanitized.split('.').pop() || '';
  const lang = LANGUAGE_MAP[ext];
  if (!lang) {
    return {
      id: 'plaintext', label: 'Text', monacoId: 'plaintext', color: '#888888',
      icon: Icons.Fallback(ext)
    };
  }
  return lang;
}

export function getRunCommand(filePath: string): string | null {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  const lang = LANGUAGE_MAP[ext];
  if (lang?.runCommand) {
    return lang.runCommand(filePath);
  }
  return null;
}

export const SUPPORTED_LANGUAGES = Object.values(LANGUAGE_MAP)
  .filter((v, i, arr) => arr.findIndex(a => a.id === v.id) === i);
