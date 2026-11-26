import { useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from './ui';

export function ThemeToggle() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));

  const toggle = () => {
    const next = !dark;
    document.documentElement.classList.toggle('dark', next);
    document.documentElement.style.colorScheme = next ? 'dark' : 'light';
    try {
      localStorage.setItem('nocap.theme', next ? 'dark' : 'light');
    } catch {}
    setDark(next);
  };

  return (
    <Button variant="ghost" size="sm" onClick={toggle} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} title={dark ? 'Switch to light mode' : 'Switch to dark mode'} aria-pressed={dark}>
      {dark ? <Sun /> : <Moon />}
    </Button>
  );
}
