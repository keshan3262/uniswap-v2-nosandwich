import { useCallback } from "react";
import clsx from "clsx";

interface SlippageToleranceOptionProps {
  value: string;
  isFirst: boolean;
  isLast: boolean;
  isSelected: boolean;
  onClick: (value: string) => void;
}

export const SlippageToleranceOption = ({
  value,
  isFirst,
  isLast,
  isSelected,
  onClick,
}: SlippageToleranceOptionProps) => {
  const handleClick = useCallback(() => onClick(value), [onClick, value]);

  return (
    <button
      type="button"
      className={clsx("btn btn-xs flex-1", !isFirst && "rounded-l-none", isSelected && "btn-primary")}
      style={isLast ? {} : { borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
      onClick={handleClick}
    >
      {value}%
    </button>
  );
};
