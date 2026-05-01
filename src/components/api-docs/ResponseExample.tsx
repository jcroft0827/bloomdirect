// /components/api-docs/ResponseExample.tsx

type Props = {
  title?: string;
  code: string;
};

import CodeBlock from "./CodeBlock";

export default function ResponseExample({ title, code }: Props) {
  return (
    <div className="mt-4">
      {title && (
        <h4 className="text-sm font-semibold text-gray-600 mb-1">
          {title}
        </h4>
      )}
      <CodeBlock code={code} />
    </div>
  );
}