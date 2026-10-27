import { z } from "zod";
import { ApiError,authenticated,failure,json } from "@/lib/api/server";
const entries = z.array(z.object({meanings:z.array(z.object({definitions:z.array(z.object({definition:z.string()}))}))}));
export async function GET(req:Request) {
  try {
    await authenticated(req);
    const word=z.string().regex(/^[a-zA-Z'-]{1,60}$/).safeParse(new URL(req.url).searchParams.get("word"));
    if(!word.success) throw new ApiError(422,"Choose a single English word.");
    let response:Response;
    try {response=await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.data)}`,{signal:AbortSignal.timeout(6000),next:{revalidate:86400}});}
    catch {throw new ApiError(503,"The dictionary service could not be reached. Please retry shortly.","dictionary_unavailable");}
    if(response.status === 404) throw new ApiError(404,"No dictionary entry found.","dictionary_not_found");
    if(!response.ok) throw new ApiError(503,"The dictionary service is temporarily unavailable. Please retry shortly.","dictionary_unavailable");
    const parsed=entries.safeParse(await response.json().catch(() => null));
    if(!parsed.success) throw new ApiError(502,"The dictionary returned an incompatible response. Please retry.","dictionary_invalid_output");
    const definition=parsed.data.flatMap(entry => entry.meanings.flatMap(meaning => meaning.definitions)).find(item => item.definition.trim())?.definition;
    if(!definition) throw new ApiError(404,"No definition found.","dictionary_not_found");
    return json({word:word.data,definition});
  }catch(error){return failure(error);}
}
