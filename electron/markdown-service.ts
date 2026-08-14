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
  const ext = (filePath.split('.').pop() || '').toLowerCase();
  const isBinary = ['pdf', 'docx', 'doc', 'xlsx', 'xls', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'zip', 'rar', '7z', 'exe', 'bin'].includes(ext) || filePath.includes(path.join('notes', 'files'));
  
  if (isBinary) {
    return '*(Este arquivo é um anexo binário. Utilize o visualizador de arquivos para abri-lo.)*';
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
  const ext = (filePath.split('.').pop() || '').toLowerCase();
  const isBinaryFile = ['pdf', 'docx', 'doc', 'xlsx', 'xls', 'csv', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext) || filePath.includes(path.join('notes', 'files'));

  if (!isBinaryFile && fs.existsSync(path.dirname(filePath))) {
    fs.writeFileSync(filePath, content, 'utf-8');
  }

  return await dbSaveNoteMeta({
    title,
    filePath,
    format: isBinaryFile ? 'file' : undefined,
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

export async function saveFileNote(fileData: { title: string; fileName: string; mimeType: string; base64: string; size: number }): Promise<NoteItem> {
  const notesDir = getNotesDir();
  const filesDir = path.join(notesDir, 'files');
  if (!fs.existsSync(filesDir)) {
    fs.mkdirSync(filesDir, { recursive: true });
  }

  const ext = (fileData.fileName.split('.').pop() || '').toLowerCase();
  const sanitized = fileData.fileName.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
  const diskFileName = `${Date.now()}_${sanitized}`;
  const diskPath = path.join(filesDir, diskFileName);

  // Write file buffer to disk permanently in app data folder
  const buffer = Buffer.from(fileData.base64, 'base64');
  fs.writeFileSync(diskPath, buffer);

  let fileType: NoteItem['fileType'] = 'other';
  if (ext === 'pdf') fileType = 'pdf';
  else if (ext === 'docx' || ext === 'doc') fileType = 'docx';
  else if (ext === 'xlsx' || ext === 'xls') fileType = 'xlsx';
  else if (ext === 'csv') fileType = 'csv';
  else if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) fileType = 'image';
  else if (['txt', 'json', 'log', 'md', 'html'].includes(ext)) fileType = 'text';

  return await dbSaveNoteMeta({
    title: fileData.title || fileData.fileName,
    filePath: diskPath,
    format: 'file',
    fileType,
    originalFileName: fileData.fileName,
    fileSize: fileData.size,
    mimeType: fileData.mimeType,
  });
}

export async function pickLocalFile(): Promise<{ filePath: string; fileName: string; mimeType: string; base64: string; size: number } | null> {
  const win = BrowserWindow.getFocusedWindow();
  const { filePaths, canceled } = await dialog.showOpenDialog(win || {}, {
    title: 'Selecionar Arquivo para Anexar às Anotações',
    properties: ['openFile'],
    filters: [
      { name: 'Todos os Documentos (*.pdf, *.docx, *.xlsx, *.csv, imagens)', extensions: ['pdf', 'docx', 'doc', 'xlsx', 'xls', 'csv', 'png', 'jpg', 'jpeg', 'webp', 'txt', 'log', 'json', 'md'] },
      { name: 'Documentos PDF (*.pdf)', extensions: ['pdf'] },
      { name: 'Documentos Word (*.docx, *.doc)', extensions: ['docx', 'doc'] },
      { name: 'Planilhas Excel & CSV (*.xlsx, *.xls, *.csv)', extensions: ['xlsx', 'xls', 'csv'] },
      { name: 'Imagens (*.png, *.jpg, *.jpeg, *.webp)', extensions: ['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif'] },
      { name: 'Todos os Arquivos (*.*)', extensions: ['*'] },
    ],
  });

  if (canceled || !filePaths || filePaths.length === 0) return null;

  const targetPath = filePaths[0];
  const stat = fs.statSync(targetPath);
  const fileName = path.basename(targetPath);
  const ext = (fileName.split('.').pop() || '').toLowerCase();

  let mimeType = 'application/octet-stream';
  if (ext === 'pdf') mimeType = 'application/pdf';
  else if (ext === 'docx') mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  else if (ext === 'doc') mimeType = 'application/msword';
  else if (ext === 'xlsx') mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  else if (ext === 'xls') mimeType = 'application/vnd.ms-excel';
  else if (ext === 'csv') mimeType = 'text/csv';
  else if (ext === 'png') mimeType = 'image/png';
  else if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
  else if (ext === 'webp') mimeType = 'image/webp';
  else if (ext === 'svg') mimeType = 'image/svg+xml';
  else if (['txt', 'json', 'log', 'md'].includes(ext)) mimeType = 'text/plain';

  const buffer = fs.readFileSync(targetPath);
  const base64 = buffer.toString('base64');

  return {
    filePath: targetPath,
    fileName,
    mimeType,
    base64,
    size: stat.size,
  };
}
