// /components/api-docs/Endpoint.tsx

type Props = {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  description: string;
  headers?: Record<string, string>;
  requestBody?: string;
  exampleRequest?: string;
  exampleResponse?: string;
  errors?: { code: string; message: string }[];
};

import CodeBlock from "./CodeBlock";
import ResponseExample from "./ResponseExample";

export default function Endpoint({
  method,
  path,
  description,
  headers,
  requestBody,
  exampleRequest,
  exampleResponse,
  errors,
}: Props) {
  return (
    <div className="border rounded-2xl p-5 bg-white shadow-sm mb-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <span className="text-xs font-bold px-2 py-1 rounded bg-blue-100 text-blue-700">
          {method}
        </span>
        <code className="text-sm font-mono">{path}</code>
      </div>

      {/* Description */}
      <p className="text-gray-700 mb-4">{description}</p>

      {/* Headers */}
      {headers && (
        <div className="mb-4">
          <h4 className="font-semibold text-sm mb-1">Headers</h4>
          <CodeBlock
            code={JSON.stringify(headers, null, 2)}
          />
        </div>
      )}

      {/* Request Body */}
      {requestBody && (
        <div className="mb-4">
          <h4 className="font-semibold text-sm mb-1">
            Request Body
          </h4>
          <CodeBlock code={requestBody} />
        </div>
      )}

      {/* Example Request */}
      {exampleRequest && (
        <ResponseExample
          title="Example Request"
          code={exampleRequest}
        />
      )}

      {/* Example Response */}
      {exampleResponse && (
        <ResponseExample
          title="Example Response"
          code={exampleResponse}
        />
      )}

      {/* Errors */}
      {errors && (
        <div className="mt-4">
          <h4 className="font-semibold text-sm mb-2">
            Possible Errors
          </h4>
          <ul className="text-sm text-red-600 space-y-1">
            {errors.map((err, i) => (
              <li key={i}>
                <strong>{err.code}:</strong> {err.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}