import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";

const VOICE = "ermil";
const ROLE = "neutral";
const DEFAULT_GRPC_HOST = "tts.api.cloud.yandex.net:443";

export interface SynthesizeParams {
  text: string;
  speed: number;
}

export interface SynthesizeResult {
  buffer: Buffer;
  contentType: string;
}

interface AudioChunkMessage {
  data?: Buffer | Uint8Array;
}

interface UtteranceSynthesisResponse {
  audioChunk?: AudioChunkMessage;
}

type SynthesizerClient = grpc.Client & {
  UtteranceSynthesis(
    request: object,
    metadata: grpc.Metadata,
  ): grpc.ClientReadableStream<UtteranceSynthesisResponse>;
};

let synthesizer: SynthesizerClient | null = null;

function protoDir(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const nextToFile = join(here, "proto");
  if (existsSync(join(nextToFile, "tts_service.proto"))) return nextToFile;
  return join(here, "../../../src/services/tts/proto");
}

function loadSynthesizer(): grpc.ServiceClientConstructor {
  const dir = protoDir();
  const definition = protoLoader.loadSync(join(dir, "tts_service.proto"), {
    includeDirs: [dir],
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });
  const loaded = grpc.loadPackageDefinition(definition) as unknown as {
    speechkit: { tts: { v3: { Synthesizer: grpc.ServiceClientConstructor } } };
  };
  return loaded.speechkit.tts.v3.Synthesizer;
}

function getClient(): SynthesizerClient {
  if (!synthesizer) {
    const host = process.env.YANDEX_TTS_GRPC_HOST?.trim() || DEFAULT_GRPC_HOST;
    const Synthesizer = loadSynthesizer();
    synthesizer = new Synthesizer(host, grpc.credentials.createSsl()) as unknown as SynthesizerClient;
  }
  return synthesizer;
}

export async function synthesize(params: SynthesizeParams): Promise<SynthesizeResult> {
  const apiKey = process.env.TTS_API_KEY;
  if (!apiKey) {
    throw new Error("TTS_API_KEY не задан");
  }

  const metadata = new grpc.Metadata();
  metadata.set("authorization", `Api-Key ${apiKey}`);

  const request = {
    text: params.text,
    hints: [{ voice: VOICE }, { role: ROLE }, { speed: params.speed }],
    outputAudioSpec: {
      containerAudio: {
        containerAudioType: "OGG_OPUS",
      },
    },
    unsafeMode: true,
  };

  const chunks = await collectAudioChunks(getClient(), request, metadata);
  if (chunks.length === 0) {
    throw new Error("SpeechKit v3 не вернул аудиофрагменты");
  }

  return {
    buffer: Buffer.concat(chunks),
    contentType: "audio/ogg",
  };
}

function collectAudioChunks(
  client: SynthesizerClient,
  request: object,
  metadata: grpc.Metadata,
): Promise<Buffer[]> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const stream = client.UtteranceSynthesis(request, metadata);

    stream.on("data", (response: UtteranceSynthesisResponse) => {
      const data = response.audioChunk?.data;
      if (data && data.byteLength > 0) {
        chunks.push(Buffer.from(data));
      }
    });

    stream.on("error", (error: Error) => {
      reject(error);
    });

    stream.on("end", () => {
      resolve(chunks);
    });
  });
}
