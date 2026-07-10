import { useClientByName } from '../store';
import InitialAvatar from './InitialAvatar';

// Cor determinística por nome (para clientes sem foto). Paleta neutra/quente.
const PALETTE = [
  'oklch(0.62 0.12 200)',
  'oklch(0.64 0.16 356)',
  'oklch(0.7 0.13 66)',
  'oklch(0.6 0.16 300)',
  'oklch(0.58 0.13 160)',
];
function colorFor(nome: string): string {
  let h = 0;
  for (let i = 0; i < nome.length; i++) h = (h * 31 + nome.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

interface Props {
  nome: string;
  size?: number;
  className?: string;
}

/** Avatar de cliente (quadrado arredondado). Foto do cadastro ou inicial. */
export default function ClientAvatar({ nome, size = 22, className }: Props) {
  const client = useClientByName(nome);
  return (
    <InitialAvatar
      name={nome}
      photoUrl={client?.photoUrl}
      color={colorFor(nome)}
      size={size}
      rounded="lg"
      className={className}
    />
  );
}

export { colorFor as clientColorFor };
