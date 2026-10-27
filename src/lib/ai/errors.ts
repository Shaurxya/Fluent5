import { APICallError, NoObjectGeneratedError, RetryError } from "ai";
import { ApiError, failure } from "@/lib/api/server";

// Never return/log provider messages, request bodies or generated text: these
// may contain credentials and private learner content. Only classify metadata.
export function contextualFailure(error: unknown): Response {
  if (error instanceof ApiError) return failure(error);
  const cause = RetryError.isInstance(error) ? error.lastError : error;
  let mapped: ApiError;
  let providerStatus: number | undefined;
  if (APICallError.isInstance(cause)) {
    providerStatus = cause.statusCode;
    switch (providerStatus) {
      case 401:
        mapped = new ApiError(503,"The AI provider rejected its API key. Check OPENROUTER_API_KEY in Vercel and redeploy.","ai_credentials"); break;
      case 402:
        mapped = new ApiError(503,"The AI provider's credit or spending limit blocked this request. Check the OpenRouter account and key limits.","ai_credit_limit"); break;
      case 403:
        mapped = new ApiError(503,"The AI provider blocked this request. Check the OpenRouter key permissions and account policies.","ai_forbidden"); break;
      case 400: case 422:
        mapped = new ApiError(502,"The AI provider rejected the explanation request format. Check the configured model's structured-output support.","ai_request_rejected"); break;
      case 404:
        mapped = new ApiError(503,"The configured AI model is unavailable. Check the OpenRouter model setting and access.","ai_model_unavailable"); break;
      case 429:
        mapped = new ApiError(429,"The AI provider is rate limiting requests. Please retry later.","ai_rate_limited"); break;
      case 408: case 504:
        mapped = new ApiError(504,"The AI explanation timed out. Please retry shortly.","ai_timeout"); break;
      default:
        mapped = new ApiError(503,"The AI provider is unreachable or temporarily unavailable. Please retry shortly.","ai_unavailable");
    }
  } else if (NoObjectGeneratedError.isInstance(cause)) {
    mapped = new ApiError(502,"The AI explanation did not match the required response format. Please retry.","ai_invalid_output");
  } else if (cause instanceof Error && ["AbortError","TimeoutError"].includes(cause.name)) {
    mapped = new ApiError(504,"The AI explanation timed out. Please retry shortly.","ai_timeout");
  } else {
    return failure(error);
  }
  console.error("Contextual AI request failed",{code:mapped.code,...(providerStatus === undefined ? {} : {provider_status:providerStatus})});
  return failure(mapped);
}
