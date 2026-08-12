import fs from 'fs';
import path from 'path';
import { app, dialog, BrowserWindow } from 'electron';
import { dbGetNotes, dbSaveNoteMeta, dbDeleteNoteMeta } from './database';
import { NoteItem } from '../src/types/index';

export function getNotesDir(): string {
  const userDataPath = app.getPath('userData');
  const notesDir = path.join(userDataPath, 'notes');
  if (!fs.existsSync(notesDir)) {
    fs.mkdirSync(notesDir, { recursive: true });
  }
  return notesDir;
}

export async function listNotes(): Promise<NoteItem[]> {
  return await dbGetNotes();
}

export function readNoteContent(filePath: string): string {
  if (!fs.existsSync(filePath)) {
    return '';
  }
  return fs.readFileSync(filePath, 'utf-8');
}

export async function createNote(title: string): Promise<NoteItem> {
  const notesDir = getNotesDir();
  const sanitizedTitle = title.replace(/[^a-zA-Z0-9_\-]/g, '_').toLowerCase();
  const fileName = `${sanitizedTitle || 'notaanonima'}_${Date.now()}.md`;
  const filePath = path.join(notesDir, fileName);

  const initialContent = `# ${title}\n\nEscreva suas anotações aqui...`;
  fs.writeFileSync(filePath, initialContent, 'utf-8');

  return await dbSaveNoteMeta({
    title,
    filePath,
  });
}

export async function saveNoteContent(filePath: string, title: string, content: string): Promise<NoteItem> {
  fs.writeFileSync(filePath, content, 'utf-8');
  return await dbSaveNoteMeta({
    title,
    filePath,
  });
}

export async function deleteNote(id: string): Promise<boolean> {
  const notes = await dbGetNotes();
  const target = notes.find((n) => n.id === id);
  if (target && fs.existsSync(target.filePath)) {
    try {
      fs.unlinkSync(target.filePath);
    } catch (e) {
      console.error('Erro ao deletar arquivo de nota física:', e);
    }
  }
  return await dbDeleteNoteMeta(id);
}

// Strip Markdown markup symbols cleanly for export to .txt
export function stripMarkdown(md: string): string {
  if (!md) return '';
  return md
    // Remove headers (#, ##, etc.)
    .replace(/^#{1,6}\s+/gm, '')
    // Remove bold/italic (***, **, *, ___, __, _)
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    // Remove inline code & code blocks (```)
    .replace(/```[\s\S]*?```/g, (match) => {
      return match.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/, '');
    })
    .replace(/`([^`]+)`/g, '$1')
    // Remove blockquotes (> )
    .replace(/^\s*>\s+/gm, '')
    // Remove links [text](url) -> text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove images ![alt](url) -> alt
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    // Remove horizontal rules (---, ***, ___)
    .replace(/^[*\-_]{3,}\s*$/gm, '')
    // Remove unordered list bullets (*, -, +)
    .replace(/^\s*[-*+]\s+/gm, '')
    // Remove ordered list numbers (1., 2., etc.)
    .replace(/^\s*\d+\.\s+/gm, '')
    .trim();
}

export async function exportNoteAsTxt(content: string, defaultTitle: string): Promise<boolean> {
  const cleanTxt = stripMarkdown(content);
  const win = BrowserWindow.getFocusedWindow();
  
  const { filePath, canceled } = await dialog.showSaveDialog(win || {}, {
    title: 'Exportar Anotação em TXT (Sem Marcações)',
    defaultPath: `${defaultTitle.replace(/[^a-zA-Z0-9_\-]/g, '_') || 'anotacao'}.txt`,
    filters: [{ name: 'Arquivo de Texto (*.txt)', extensions: ['txt'] }],
  });

  if (canceled || !filePath) {
    return false;
  }

  fs.writeFileSync(filePath, cleanTxt, 'utf-8');
  return true;
}

export async function createRichNote(title: string): Promise<NoteItem> {
  const notesDir = getNotesDir();
  const sanitizedTitle = title.replace(/[^a-zA-Z0-9_\-]/g, '_').toLowerCase();
  const fileName = `${sanitizedTitle || 'notaanonima'}_${Date.now()}.html`;
  const filePath = path.join(notesDir, fileName);

  // Initial empty HTML content for Tiptap
  const initialContent = `<h1>${title}</h1><p>Escreva suas anotações aqui...</p>`;
  fs.writeFileSync(filePath, initialContent, 'utf-8');

  return await dbSaveNoteMeta({
    title,
    filePath,
    format: 'richtext',
  });
}

export async function saveNoteImage(base64Data: string, ext: string): Promise<string> {
  const notesDir = getNotesDir();
  const imagesDir = path.join(notesDir, 'images');
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }
  const fileName = `img_${Date.now()}_${Math.random().toString(36).substr(2, 6)}.${ext || 'png'}`;
  const filePath = path.join(imagesDir, fileName);

  // Strip data URL prefix if present for physical save
  const base64Clean = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
  fs.writeFileSync(filePath, Buffer.from(base64Clean, 'base64'));

  // Return base64 Data URL so Chromium renderer never blocks image display with file:// security errors
  return base64Data.startsWith('data:image/')
    ? base64Data
    : `data:image/${ext || 'png'};base64,${base64Clean}`;
}
