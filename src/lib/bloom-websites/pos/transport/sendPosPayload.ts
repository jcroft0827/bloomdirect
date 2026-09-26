import { Readable } from "stream";
import path from "path";

export type BloomPosTransportProtocol = "ftp" | "ftps" | "sftp";

export type BloomPosTransportConfig = {
  protocol: BloomPosTransportProtocol;
  host: string;
  port: number;
  folder: string;
  username: string;
  password: string;
};

function normalizedFolder(value: string) {
  const trimmed = String(value || "/").trim();
  if (!trimmed) return "/";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function remotePath(folder: string, filename: string) {
  return path.posix.join(normalizedFolder(folder), filename);
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Unknown POS transport error.";
}

export async function testPosTransportConnection(config: BloomPosTransportConfig) {
  if (config.protocol === "sftp") {
    const module = await import("ssh2-sftp-client");
    const SftpClient = module.default;
    const client = new SftpClient();

    try {
      await client.connect({
        host: config.host,
        port: config.port,
        username: config.username,
        password: config.password,
        readyTimeout: 8000,
      });

      const folder = normalizedFolder(config.folder);
      const exists = await client.exists(folder);

      if (!exists) {
        throw new Error(`Remote folder ${folder} could not be found.`);
      }

      await client.list(folder);

      return {
        success: true as const,
        message: `Connected successfully to ${config.host}:${config.port} using SFTP.`,
      };
    } catch (error) {
      throw new Error(errorMessage(error));
    } finally {
      try {
        await client.end();
      } catch {
        // Best-effort cleanup only.
      }
    }
  }

  const { Client } = await import("basic-ftp");
  const client = new Client(8000);
  client.ftp.verbose = false;

  try {
    await client.access({
      host: config.host,
      port: config.port,
      user: config.username,
      password: config.password,
      secure:
        config.protocol === "ftps"
          ? config.port === 990
            ? "implicit"
            : true
          : false,
      secureOptions:
        config.protocol === "ftps"
          ? {
              rejectUnauthorized: true,
            }
          : undefined,
    });

    await client.cd(normalizedFolder(config.folder));

    return {
      success: true as const,
      message: `Connected successfully to ${config.host}:${config.port} using ${config.protocol.toUpperCase()}.`,
    };
  } catch (error) {
    throw new Error(errorMessage(error));
  } finally {
    client.close();
  }
}

export async function sendPosPayload({
  config,
  filename,
  payload,
}: {
  config: BloomPosTransportConfig;
  filename: string;
  payload: string;
}) {
  const destination = remotePath(config.folder, filename);

  if (config.protocol === "sftp") {
    const module = await import("ssh2-sftp-client");
    const SftpClient = module.default;
    const client = new SftpClient();

    try {
      await client.connect({
        host: config.host,
        port: config.port,
        username: config.username,
        password: config.password,
        readyTimeout: 8000,
      });

      await client.put(Buffer.from(payload, "utf8"), destination);

      return {
        success: true as const,
        remotePath: destination,
      };
    } catch (error) {
      throw new Error(errorMessage(error));
    } finally {
      try {
        await client.end();
      } catch {
        // Best-effort cleanup only.
      }
    }
  }

  const { Client } = await import("basic-ftp");
  const client = new Client(8000);
  client.ftp.verbose = false;

  try {
    await client.access({
      host: config.host,
      port: config.port,
      user: config.username,
      password: config.password,
      secure:
        config.protocol === "ftps"
          ? config.port === 990
            ? "implicit"
            : true
          : false,
      secureOptions:
        config.protocol === "ftps"
          ? {
              rejectUnauthorized: true,
            }
          : undefined,
    });

    await client.cd(normalizedFolder(config.folder));
    await client.uploadFrom(Readable.from([payload]), filename);

    return {
      success: true as const,
      remotePath: destination,
    };
  } catch (error) {
    throw new Error(errorMessage(error));
  } finally {
    client.close();
  }
}
