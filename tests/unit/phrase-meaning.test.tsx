// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { PhraseMeaning } from "@/components/nlp/PhraseMeaning";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const response = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });
const unavailable = () => response({error:{message:"Contextual AI is not configured. Local NLP analysis remains available."}},503);
const meaning = {
  phrase:"aesthetically pleasing areas", meaning:"Places that look attractive.",
  context:{register:"neutral",whenToUse:"When describing attractive surroundings.",whoWith:"Anyone.",
    scenarios:[],naturalness:"common",sayItAnotherWay:[]},collocations:[],
};
const explain = () => fireEvent.click(screen.getByRole("button",{name:"Explain this phrase"}));

describe("phrase explanations", () => {
  it("uses the contextual explanation when available without a dictionary lookup", async () => {
    const fetch = vi.spyOn(globalThis,"fetch").mockResolvedValue(response(meaning));
    render(<PhraseMeaning phrase={meaning.phrase} context="A passage about parks." />); explain();
    await screen.findByText("Places that look attractive.");
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetch.mock.calls[0][1]?.body as string)).toMatchObject({mode:"chunk",input:{phrase:meaning.phrase,context:"A passage about parks."}});
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
  it("tries a second content word when the first has no entry, keeping the AI failure visible", async () => {
    const fetch = vi.spyOn(globalThis,"fetch")
      .mockResolvedValueOnce(unavailable())
      .mockResolvedValueOnce(response({error:{message:"No dictionary entry found."}},404))
      .mockResolvedValueOnce(response({definition:"Giving enjoyment or satisfaction."}));
    render(<PhraseMeaning phrase={meaning.phrase} context="A passage about parks." />); explain();
    await screen.findByText(/Dictionary definition of “pleasing”/);
    expect(fetch.mock.calls.map(([url]) => url)).toEqual(["/api/ai/analyze","/api/learning/definition?word=aesthetically","/api/learning/definition?word=pleasing"]);
    expect(screen.getByRole("status")).toHaveTextContent("Contextual AI is not configured.");
    expect(screen.getByText(/not a contextual phrase explanation/)).toBeVisible();
  });
  it("bounds dictionary attempts and preserves the server's useful error", async () => {
    const fetch = vi.spyOn(globalThis,"fetch").mockResolvedValue(response({error:{message:"Daily request limit reached."}},429));
    render(<PhraseMeaning phrase="the good good kind beautiful gardens" context="A passage." />); explain();
    await waitFor(() => expect(screen.getByRole("button")).toBeEnabled());
    expect(fetch).toHaveBeenCalledTimes(4);
    expect(fetch.mock.calls.slice(1).map(([url]) => url)).toEqual(["/api/learning/definition?word=good","/api/learning/definition?word=kind","/api/learning/definition?word=beautiful"]);
    expect(screen.getByRole("status")).toHaveTextContent("Daily request limit reached.");
    expect(screen.getByRole("status")).toHaveTextContent("No dictionary definition was found either.");
  });
  it("clears the previous fallback and failure after a successful retry", async () => {
    vi.spyOn(globalThis,"fetch").mockResolvedValueOnce(unavailable())
      .mockResolvedValueOnce(response({definition:"Related to beauty."}))
      .mockResolvedValueOnce(response(meaning));
    render(<PhraseMeaning phrase={meaning.phrase} context="A passage." />); explain();
    await screen.findByText(/Dictionary definition of/);
    await waitFor(() => expect(screen.getByRole("button")).toBeEnabled()); explain();
    await screen.findByText("Places that look attractive.");
    expect(screen.queryByText(/Dictionary definition of/)).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
