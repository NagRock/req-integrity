import { invoke } from '@forge/bridge';

export interface MissingIssue {
  proposedSummary: string;
  rationale: string;
}

interface AnalysisResponse {
  content: string;
  error?: string;
  missingIssues?: MissingIssue[];
}

/**
 * Send issue data to OpenAI for analysis via Forge resolver
 *
 * @param mainSummary - The summary of the main issue
 * @param mainDescription - The description of the main issue
 * @param childIssues - Array of child issue summaries
 * @returns The analysis response with analysis text and missing issues suggestions
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
        error: result.error,
        missingIssues: []
      };
    }

    return {
      content: result.content || '',
      missingIssues: result.missingIssues || []
    };
  } catch (error) {
    console.error('Error during analysis:', error);
    return {
      content: '',
      error: (error as Error).message || 'An unexpected error occurred',
      missingIssues: []
    };
  }
}
