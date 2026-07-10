import { personColor } from '../lib';
import { usePerson } from '../store';
import type { PersonId } from '../types';
import InitialAvatar from './InitialAvatar';

interface Props {
  id: PersonId;
  size?: number;
  ring?: boolean;
  onClick?: () => void;
  title?: string;
}

/** Avatar de pessoa (círculo). Lê a foto do contexto; fallback = inicial. */
export default function Avatar({ id, size = 24, ring = false, onClick, title }: Props) {
  const p = usePerson(id);
  if (!p) return null;
  return (
    <InitialAvatar
      name={p.name}
      photoUrl={p.photoUrl}
      color={personColor(id)}
      size={size}
      ring={ring}
      rounded="full"
      onClick={onClick}
      title={title}
    />
  );
}
