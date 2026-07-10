import { initial } from '../lib';

interface Props {
  name: string;
  photoUrl?: string;
  color: string; // css color/var usado quando não há foto
  size?: number;
  ring?: boolean;
  rounded?: 'full' | 'lg'; // pessoas = círculo; clientes = quadrado arredondado
  onClick?: () => void;
  title?: string;
  className?: string;
}

/** Avatar base: mostra foto (cover) ou a inicial sobre uma cor sólida. */
export default function InitialAvatar({
  name,
  photoUrl,
  color,
  size = 24,
  ring = false,
  rounded = 'full',
  onClick,
  title,
  className = '',
}: Props) {
  // Só longhands de background — misturar o shorthand `background` com
  // backgroundImage/Size/Position dispara warning do React ao trocar a foto.
  const style: React.CSSProperties = {
    width: size,
    height: size,
    fontSize: size * 0.42,
    backgroundColor: photoUrl ? undefined : color,
    backgroundImage: photoUrl ? `url(${photoUrl})` : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  };
  const Cmp = onClick ? 'button' : 'span';
  return (
    <Cmp
      onClick={onClick}
      aria-label={name}
      title={title ?? name}
      style={style}
      className={[
        'inline-flex shrink-0 items-center justify-center font-semibold text-white select-none',
        rounded === 'full' ? 'rounded-full' : 'rounded-lg',
        ring ? 'ring-2 ring-white' : '',
        onClick ? 'cursor-pointer transition-transform hover:scale-105' : '',
        className,
      ].join(' ')}
    >
      {!photoUrl && initial(name)}
    </Cmp>
  );
}
