type Props = {
  radius: string;
  x: string;
  y: string;
  onRadiusChange: (v: string) => void;
  onXChange: (v: string) => void;
  onYChange: (v: string) => void;
};

export default function CircularInputs({
  radius,
  x,
  y,
  onRadiusChange,
  onXChange,
  onYChange,
}: Props) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-semibold mb-1 text-gray-900 dark:text-white">Radius</label>
        <input
          value={radius}
          onChange={(e) => onRadiusChange(e.target.value)}
          placeholder="radius"
          className="w-full rounded px-3 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 shadow-sm focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold mb-1 text-gray-900 dark:text-white">
          Coordinates
        </label>
        <div className="flex gap-2">
          <input
            value={x}
            onChange={(e) => onXChange(e.target.value)}
            placeholder="x"
            className="w-full rounded px-3 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 shadow-sm focus:outline-none"
          />
          <input
            value={y}
            onChange={(e) => onYChange(e.target.value)}
            placeholder="y"
            className="w-full rounded px-3 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 shadow-sm focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}