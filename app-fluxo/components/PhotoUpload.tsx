import { useRef, useState } from 'react';
import { Camera, X, Loader2 } from 'lucide-react';
import InitialAvatar from './InitialAvatar';

interface Props {
  name: string;
  photoUrl?: string;
  color: string;
  size?: number;
  rounded?: 'full' | 'lg';
  // Recebe o arquivo cru; o pai faz o upload pro Storage e persiste a URL.
  onUpload: (file: File) => Promise<void>;
  onRemove: () => void;
}

/** Avatar editável: clique escolhe/troca a foto; × remove. */
export default function PhotoUpload({
  name,
  photoUrl,
  color,
  size = 56,
  rounded = 'full',
  onUpload,
  onRemove,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite reescolher o mesmo arquivo
    if (!file || !file.type.startsWith('image/')) return;
    try {
      setBusy(true);
      await onUpload(file);
    } catch {
      // falha de upload: apenas não troca a foto (erro logado no pai)
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative inline-block" style={{ width: size, height: size }}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        title={photoUrl ? 'Trocar foto' : 'Adicionar foto'}
        className="group relative block h-full w-full"
      >
        <InitialAvatar name={name} photoUrl={photoUrl} color={color} size={size} rounded={rounded} />
        <span
          className={[
            'absolute inset-0 flex items-center justify-center bg-black/45 text-white transition-opacity',
            rounded === 'full' ? 'rounded-full' : 'rounded-lg',
            busy ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
          ].join(' ')}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
        </span>
      </button>
      {photoUrl && !busy && (
        <button
          type="button"
          onClick={onRemove}
          title="Remover foto"
          className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-ink-soft shadow ring-1 ring-black/10 hover:text-ink"
        >
          <X className="h-3 w-3" />
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}
