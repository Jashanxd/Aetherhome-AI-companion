const STT_API_BASE_URL = "http://127.0.0.1:8002";

function float32ToWav(
  samples: Float32Array,
  sampleRate = 16000,
): Blob {
  const buffer = new ArrayBuffer(
    44 + samples.length * 2,
  );

  const view = new DataView(buffer);

  const writeString = (
    offset: number,
    value: string,
  ) => {
    for (let i = 0; i < value.length; i++) {
      view.setUint8(
        offset + i,
        value.charCodeAt(i),
      );
    }
  };

  writeString(0, "RIFF");
  view.setUint32(
    4,
    36 + samples.length * 2,
    true,
  );
  writeString(8, "WAVE");

  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(
    28,
    sampleRate * 2,
    true,
  );
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);

  writeString(36, "data");
  view.setUint32(
    40,
    samples.length * 2,
    true,
  );

  for (
    let i = 0;
    i < samples.length;
    i++
  ) {
    const sample = Math.max(
      -1,
      Math.min(1, samples[i]),
    );

    view.setInt16(
      44 + i * 2,
      sample < 0
        ? sample * 0x8000
        : sample * 0x7fff,
      true,
    );
  }

  return new Blob(
    [buffer],
    { type: "audio/wav" },
  );
}

export async function transcribeAudio(
  audio: Float32Array,
  signal?: AbortSignal,
): Promise<string> {
  const wav = float32ToWav(
    audio,
    16000,
  );

  const formData = new FormData();

  formData.append(
    "audio",
    wav,
    "speech.wav",
  );

  const response = await fetch(
    `${STT_API_BASE_URL}/transcribe`,
    {
      method: "POST",
      body: formData,
      signal,
    },
  );

  if (!response.ok) {
    const detail =
      await response.text().catch(
        () => "",
      );

    throw new Error(
      detail ||
        `STT request failed (${response.status}).`,
    );
  }

  const data = (await response.json()) as {
    text?: string;
  };

  return (
    typeof data.text === "string"
      ? data.text
      : ""
  ).trim();
}