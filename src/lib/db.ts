import localforage from 'localforage';

export interface DocumentMeta {
  id: string;
  name: string;
  timestamp: number;
  lastPage?: number;
}

export const dbFiles = localforage.createInstance({ name: 'pdfviewer', storeName: 'files' });
export const dbMeta = localforage.createInstance({ name: 'pdfviewer', storeName: 'metadata' });
export const dbExplanations = localforage.createInstance({ name: 'pdfviewer', storeName: 'explanations' });

export const getDocuments = async (): Promise<DocumentMeta[]> => {
  const meta: DocumentMeta[] = [];
  await dbMeta.iterate((value: DocumentMeta) => { meta.push(value); });
  return meta.sort((a, b) => b.timestamp - a.timestamp);
};

export const saveDocument = async (id: string, name: string, blob: Blob) => {
  await dbFiles.setItem(id, blob);
  await dbMeta.setItem(id, { id, name, timestamp: Date.now(), lastPage: 1 });
};

export const updateDocumentPage = async (id: string, page: number) => {
  const meta: any = await dbMeta.getItem(id);
  if (meta) {
    meta.lastPage = page;
    await dbMeta.setItem(id, meta);
  }
};

export const getDocumentBlob = async (id: string): Promise<Blob | null> => {
  return await dbFiles.getItem(id);
};

export const deleteDocument = async (id: string) => {
  await dbFiles.removeItem(id);
  await dbMeta.removeItem(id);
  await dbExplanations.removeItem(id);
};

export const getExplanations = async (id: string): Promise<Record<string, any>> => {
  const data = await dbExplanations.getItem(id);
  return (data as any) || {};
};

export const saveExplanation = async (id: string, page: number, content: string) => {
  const current = (await dbExplanations.getItem(id) as any) || {};
  current[page] = { status: "done", content };
  await dbExplanations.setItem(id, current);
};
