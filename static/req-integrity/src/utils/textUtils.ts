/**
 * Utility function to extract plain text from Atlassian Document Format (ADF) object
 * @param description - The ADF object or string to extract text from
 * @returns Plain text extracted from ADF
 */
export const extractTextFromADF = (description: any): string => {
  if (!description) return '';

  // If it's already a string, return it
  if (typeof description === 'string') return description;

  try {
    // If it's an ADF object with content
    if (description.content && Array.isArray(description.content)) {
      return description.content.map(item => {
        if (item.content && Array.isArray(item.content)) {
          return item.content.map(textItem => textItem.text || '').join('');
        }
        return item.text || '';
      }).join('\n');
    }

    // Fallback - convert to string representation
    return JSON.stringify(description);
  } catch (e) {
    console.error('Error parsing description:', e);
    return '';
  }
};
