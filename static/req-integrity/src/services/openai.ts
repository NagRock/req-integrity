import { invoke } from '@forge/bridge';

interface AnalysisResponse {
  content: string;
  error?: string;
}

/**
 * Send issue data to OpenAI for analysis via Forge resolver
 *
 * @param mainSummary - The summary of the main issue
 * @param mainDescription - The description of the main issue
 * @param childIssues - Array of child issue summaries
 * @returns The analysis response
 */
export async function analyzeIssueIntegrity(
  mainSummary: string,
  mainDescription: string,
  childIssues: { key: string; summary: string }[]
): Promise<AnalysisResponse> {
  try {
    // Use the Forge resolver to handle the OpenAI API call
    const result = await invoke('analyzeRequirements', {
      mainSummary,
      mainDescription,
      childIssues
    });

    if (result.error) {
      return {
        content: '',
        error: result.error
      };
    }

    return {
      content: result.content
    };
  } catch (error) {
    console.error('Error during requirement analysis:', error);
    return {
      content: '',
      error: error instanceof Error ? error.message : 'Unknown error occurred during analysis'
    };
  }
}
