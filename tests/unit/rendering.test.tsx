// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { AnalysisResults, GrammarErrorHighlighter } from "@/components/nlp/AnalysisResults";
import { SpeechRecorder } from "@/components/nlp/SpeechRecorder";
import { analysisSchema } from "@/lib/nlp/contracts";
import { learningSignals } from "@/lib/learning/analytics";
import fixture from "../fixtures/cycle-analysis.json";
afterEach(() => {cleanup();vi.restoreAllMocks();});

describe("analysis UI and learning signals",() => {
  it("highlights Unicode offsets without interpreting generated HTML",() => {
    const text="🙂 I goes home. <script>private()</script>";
    const {container}=render(<GrammarErrorHighlighter text={text} errors={[{id:"1",start:4,end:8,original:"goes",replacements:["go"],category:"agreement",explanation:"Check agreement",source:"rules"}]} />);
    expect(container.querySelector("mark")).toHaveTextContent("goes");expect(container.querySelector("script")).toBeNull();expect(container).toHaveTextContent("🙂 I goes home.");
  });
  it("renders genuine metrics and limitations from a validated Python response",() => {
    render(<AnalysisResults analysis={analysisSchema.parse(fixture)} />);
    expect(screen.getByTestId("analysis-results")).toBeVisible();expect(screen.getByText(/not a certified proficiency/)).toBeVisible();
    expect(screen.getAllByText(/Grammar uses limited local rules/).length).toBeGreaterThan(0);
  });
  it("saves a recommendation and reports completion only after API success",async () => {
    const fetch=vi.spyOn(globalThis,"fetch").mockResolvedValue(new Response(JSON.stringify({saved:1}),{status:200}));
    render(<AnalysisResults analysis={analysisSchema.parse(fixture)} />);fireEvent.click(screen.getAllByRole("button",{name:"Save phrase"})[0]);
    await waitFor(() => expect(screen.getByRole("button",{name:"Saved to review"})).toBeVisible());
    expect(fetch).toHaveBeenCalledWith("/api/learning/chunks",expect.objectContaining({method:"POST"}));
  });
  it("shows recoverable save errors",async () => {
    vi.spyOn(globalThis,"fetch").mockResolvedValue(new Response(JSON.stringify({error:{message:"Storage unavailable"}}),{status:503}));
    render(<AnalysisResults analysis={analysisSchema.parse(fixture)} />);fireEvent.click(screen.getAllByRole("button",{name:"Save phrase"})[0]);
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Storage unavailable"));
  });
  it("does not create recommendations from one session or invent metrics",() => {
    expect(learningSignals([{created_at:"2026-10-27",result:fixture}]).recommendations).toHaveLength(0);
    const signals=learningSignals([{created_at:"2026-10-26",result:fixture},{created_at:"2026-10-27",result:fixture}]);
    expect(signals.recommendations.some((r) => r.category === "tense")).toBe(true);
    expect(signals.trends[0].diversity).toBeNull();
  });
  it("allows a typed fallback while leaving speaking duration unmeasured",() => {
    const complete=vi.fn();render(<SpeechRecorder onComplete={complete} />);
    fireEvent.change(screen.getByLabelText("Your spoken response"),{target:{value:"This is a typed practice response."}});
    fireEvent.click(screen.getByRole("button",{name:"Continue to analysis"}));
    expect(complete).toHaveBeenCalledWith("This is a typed practice response.",null);
  });
});
