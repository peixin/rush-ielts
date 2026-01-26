import type { Route } from "./+types/api.dict";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const word = url.searchParams.get("q");

  if (!word) {
    return Response.json({ error: "Missing query" }, { status: 400 });
  }

  try {
    const YOUDAO_API_URL = 'https://dict.youdao.com/jsonapi';
    const params = new URLSearchParams({
      q: word,
      dicts: JSON.stringify({ count: 99, dicts: [['ec', 'phrs', 'typos', 'blng_sents_part']] }),
      client: 'mobile'
    });

    const apiUrl = `${YOUDAO_API_URL}?${params.toString()}`;
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`Upstream API error: ${response.status}`);
    }

    const data = await response.json();
    const parsed = parseYoudaoData(word, data);

    if (!parsed) {
      return Response.json({ error: "Word not found" }, { status: 404 });
    }

    return Response.json(parsed);

  } catch (error) {
    console.error("Dictionary lookup failed:", error);
    return Response.json({ error: "Lookup failed" }, { status: 500 });
  }
}

function parseYoudaoData(word: string, data: any) {
  if (!data) return null;

  const ec = data.ec || {};
  // const simple = data.simple || {}; 
  
  // Basic validation: must have a definition in 'ec' or be a valid entry
  // If 'ec' is empty, it's likely a typo or not found in the dictionary we care about.
  if (!ec.word && !data.blng_sents_part) {
      return null;
  }

  let entry = {
    word: word,
    phonetic: '',
    definition: [] as string[],
    examples: [] as any[],
    audio: '' // Will set below
  };

  if (ec.word && ec.word.length > 0) {
    const target = ec.word[0];
    if (target.usphone) entry.phonetic = `/${target.usphone}/`;
    else if (target.ukphone) entry.phonetic = `/${target.ukphone}/`;
    else if (target.phone) entry.phonetic = `/${target.phone}/`;

    // Audio priority: US Speech -> UK Speech -> Generated
    // Usually it is "http://dict.youdao.com/speech?audio=..."
    // If it's a full URL, we should just use it (and upgrade to https).
    
    if (target.usSpeech) {
        entry.audio = target.usSpeech.replace('http://', 'https://');
    } else if (target.ukSpeech) {
        entry.audio = target.ukSpeech.replace('http://', 'https://');
    }

    if (target.trs) {
        entry.definition = target.trs.map((t: any) => t.tr && t.tr[0] && t.tr[0].l && t.tr[0].l.i && t.tr[0].l.i.join(' ')).filter(Boolean);
    }
  }

  // Fallback audio if not set (e.g. phrases or not found in EC)
  if (!entry.audio) {
      entry.audio = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=1`;
  }

  // Examples
  if (data.blng_sents_part && data.blng_sents_part['sentence-pair']) {
    entry.examples = data.blng_sents_part['sentence-pair'].map((pair: any) => ({
      en: pair.sentence,
      cn: pair['sentence-translation'],
      // sentence-speech is usually "Text+Here&le=eng"
      // We need to prepend the endpoint.
      audio: `https://dict.youdao.com/dictvoice?audio=${pair['sentence-speech']}`
    })).slice(0, 3);
  }

  // Require at least a definition or examples to consider it "found"
  if (entry.definition.length === 0 && entry.examples.length === 0) {
      return null;
  }

  return entry;
}
