import { z } from "zod";
import { ApiError,authenticated,failure,json } from "@/lib/api/server";
const entries = z.array(z.object({meanings:z.array(z.object({definitions:z.array(z.object({definition:z.string()}))}))}));
export async function GET(req:Request) {
  try {
    await authenticated(req);
    const word=z.string().regex(/^[a-zA-Z'-]{1,60}$/).safeParse(new URL(req.url).searchParams.get("word"));
    if(!word.success) throw new ApiError(422,"Choose a single English word.");
    const response=await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.data)}`,{signal:AbortSignal.timeout(6000),next:{revalidate:86400}});
    if(!response.ok) throw new ApiError(404,"No dictionary entry found.");
    const parsed=entries.parse(await response.json());
    const definition=parsed[0]?.meanings[0]?.definitions[0]?.definition;
    if(!definition) throw new ApiError(404,"No definition found.");
    return json({word:word.data,definition});
  }catch(error){return failure(error);}
}
