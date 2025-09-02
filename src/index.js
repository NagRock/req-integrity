import Resolver from '@forge/resolver';
import api, { route, fetch } from '@forge/api';

const resolver = new Resolver();

resolver.define('getText', (req) => {
    console.log(req);

    return 'Hello, world!';
});

// Function to get issue key from issue ID
resolver.define('getIssueKey', async ({ payload }) => {
    const { issueId } = payload;

    // Call the Jira API to get issue information
    const response = await api.asUser().requestJira(
        route`/rest/api/3/issue/${issueId}`
    );

    const data = await response.json();
    return { key: data.key };
});

// Function to get parent and child issue relationships
resolver.define('getIssueRelationships', async ({ payload }) => {
    const { issueKey } = payload;
    const relationships = {
        children: [],
        childrenDetails: [],
        summary: '',
        description: ''
    };

    try {
        // Get issue details including parent, summary and description
        const issueResponse = await api.asUser().requestJira(
            route`/rest/api/3/issue/${issueKey}?fields=parent,summary,description,issuetype`
        );

        const issueData = await issueResponse.json();
        if (issueData.fields) {
            // Get parent if available
            if (issueData.fields.parent) {
                relationships.parent = issueData.fields.parent.key;
            }

            // Get summary and description
            relationships.summary = issueData.fields.summary || '';
            relationships.description = issueData.fields.description || '';
        }

        // Collection to track child keys we've already processed
        const childKeys = new Set();

        // Use standard JQL to find direct child issues (works in all Jira versions)
        try {
            const parentChildrenResponse = await api.asUser().requestJira(
                route`/rest/api/3/search?jql=parent=${issueKey}&fields=summary,issuetype`
            );

            const parentChildrenData = await parentChildrenResponse.json();

            if (parentChildrenData.issues && Array.isArray(parentChildrenData.issues)) {
                console.log(`Found ${parentChildrenData.issues.length} direct parent-child linked issues for ${issueKey}`);
                for (const issue of parentChildrenData.issues) {
                    childKeys.add(issue.key);
                    relationships.children.push(issue.key);
                    relationships.childrenDetails.push({
                        key: issue.key,
                        summary: issue.fields && issue.fields.summary ? issue.fields.summary : '',
                        issuetype: issue.fields && issue.fields.issuetype ? issue.fields.issuetype.name : ''
                    });
                }
            }
        } catch (error) {
            console.error(`Error fetching direct parent-child issues for ${issueKey}:`, error);
        }

        // Check for subtasks (works in all Jira versions)
        try {
            const subtasksResponse = await api.asUser().requestJira(
                route`/rest/api/3/issue/${issueKey}?fields=subtasks`
            );

            const subtasksData = await subtasksResponse.json();
            if (subtasksData.fields && subtasksData.fields.subtasks) {
                console.log(`Found ${subtasksData.fields.subtasks.length} subtasks for ${issueKey}`);
                for (const subtask of subtasksData.fields.subtasks) {
                    if (!childKeys.has(subtask.key)) {
                        childKeys.add(subtask.key);
                        relationships.children.push(subtask.key);
                        // If the subtask has fields data, add it directly
                        if (subtask.fields && subtask.fields.summary) {
                            relationships.childrenDetails.push({
                                key: subtask.key,
                                summary: subtask.fields.summary,
                                issuetype: subtask.fields.issuetype ? subtask.fields.issuetype.name : 'Subtask'
                            });
                        } else {
                            // Otherwise, we'll fetch details below
                        }
                    }
                }
            }
        } catch (error) {
            console.error(`Error fetching subtasks for ${issueKey}:`, error);
        }

        // If it's an Epic, look for stories linked to this Epic
        const isEpic = issueData.fields.issuetype &&
                      issueData.fields.issuetype.name === 'Epic';

        if (isEpic) {
            try {
                // Try standard Epic link
                const epicChildrenResponse = await api.asUser().requestJira(
                    route`/rest/api/3/search?jql=epic=${issueKey}&fields=summary,issuetype`
                );

                const epicChildrenData = await epicChildrenResponse.json();
                if (epicChildrenData.issues && Array.isArray(epicChildrenData.issues)) {
                    console.log(`Found ${epicChildrenData.issues.length} epic-linked issues for ${issueKey}`);
                    for (const issue of epicChildrenData.issues) {
                        if (!childKeys.has(issue.key)) {
                            childKeys.add(issue.key);
                            relationships.children.push(issue.key);
                            relationships.childrenDetails.push({
                                key: issue.key,
                                summary: issue.fields && issue.fields.summary ? issue.fields.summary : '',
                                issuetype: issue.fields && issue.fields.issuetype ? issue.fields.issuetype.name : ''
                            });
                        }
                    }
                }
            } catch (epicError) {
                console.error(`Error fetching Epic children for ${issueKey} using epic=:`, epicError);

                // Try with the custom field approach as fallback
                try {
                    const epicLinkResponse = await api.asUser().requestJira(
                        route`/rest/api/3/search?jql=cf[10001]="${issueKey}"&fields=summary,issuetype`
                    );

                    const epicLinkData = await epicLinkResponse.json();
                    if (epicLinkData.issues && Array.isArray(epicLinkData.issues)) {
                        console.log(`Found ${epicLinkData.issues.length} epic-linked issues via custom field for ${issueKey}`);
                        for (const issue of epicLinkData.issues) {
                            if (!childKeys.has(issue.key)) {
                                childKeys.add(issue.key);
                                relationships.children.push(issue.key);
                                relationships.childrenDetails.push({
                                    key: issue.key,
                                    summary: issue.fields && issue.fields.summary ? issue.fields.summary : '',
                                    issuetype: issue.fields && issue.fields.issuetype ? issue.fields.issuetype.name : ''
                                });
                            }
                        }
                    }
                } catch (cfError) {
                    console.error(`Error fetching Epic children for ${issueKey} using custom field:`, cfError);
                }
            }
        }

        // Check for issue links that might represent parent-child relationships
        try {
            const linksResponse = await api.asUser().requestJira(
                route`/rest/api/3/issue/${issueKey}?fields=issuelinks`
            );

            const linksData = await linksResponse.json();
            if (linksData.fields && linksData.fields.issuelinks) {
                let linkChildrenCount = 0;
                for (const link of linksData.fields.issuelinks) {
                    if (link.outwardIssue && link.type) {
                        // Check for various child relationship types
                        if (
                            link.type.name === 'Parent/Child' ||
                            link.type.name.toLowerCase().includes('subtask') ||
                            link.type.outward === 'is parent of' ||
                            link.type.outward === 'contains' ||
                            link.type.outward === 'has'
                        ) {
                            const childKey = link.outwardIssue.key;
                            if (!childKeys.has(childKey)) {
                                childKeys.add(childKey);
                                relationships.children.push(childKey);
                                linkChildrenCount++;

                                // If we have summary in the link data, use it
                                if (link.outwardIssue.fields && link.outwardIssue.fields.summary) {
                                    relationships.childrenDetails.push({
                                        key: childKey,
                                        summary: link.outwardIssue.fields.summary,
                                        issuetype: link.outwardIssue.fields.issuetype ? link.outwardIssue.fields.issuetype.name : ''
                                    });
                                }
                            }
                        }
                    }
                }
                console.log(`Found ${linkChildrenCount} linked child issues for ${issueKey}`);
            }
        } catch (error) {
            console.error(`Error fetching issue links for ${issueKey}:`, error);
        }

        // Fetch details for each child issue that doesn't already have details
        if (relationships.children.length > 0) {
            const existingDetailKeys = new Set(relationships.childrenDetails.map(item => item.key));
            const childrenNeedingDetails = relationships.children.filter(key => !existingDetailKeys.has(key));

            if (childrenNeedingDetails.length > 0) {
                console.log(`Fetching details for ${childrenNeedingDetails.length} child issues`);

                for (const childKey of childrenNeedingDetails) {
                    try {
                        const childResponse = await api.asUser().requestJira(
                            route`/rest/api/3/issue/${childKey}?fields=summary,issuetype`
                        );
                        const childData = await childResponse.json();

                        relationships.childrenDetails.push({
                            key: childKey,
                            summary: childData.fields && childData.fields.summary ? childData.fields.summary : '',
                            issuetype: childData.fields && childData.fields.issuetype ? childData.fields.issuetype.name : ''
                        });
                    } catch (childError) {
                        console.error(`Error fetching details for issue ${childKey}:`, childError);
                        // Add the key with an empty summary in case of error
                        relationships.childrenDetails.push({
                            key: childKey,
                            summary: ''
                        });
                    }
                }
            }
        }

        console.log(`Total child issues found for ${issueKey}: ${relationships.children.length}`);
    } catch (error) {
        console.error('Error fetching issue relationships:', error);
    }

    return relationships;
});

// Function to analyze requirements using OpenAI
resolver.define('analyzeRequirements', async ({ payload }) => {
    const { mainSummary, mainDescription, childIssues } = payload;

    try {
        // Format child issues for the prompt
        const childIssuesText = childIssues.map(issue =>
            `- ${issue.key}: ${issue.summary}`
        ).join('\n');

        const input = `
IMPORTANT: DO NOT search the internet. Analyze ONLY based on the information provided below.
Complete the analysis quickly and directly (under 15 seconds).

I have a main task with the following details:

Summary: ${mainSummary}

Description: ${mainDescription || '(No description provided)'}

And these are the child issues:
${childIssuesText}

Your task is to ONLY analyze if there is sufficient alignment between what's specified in the main task and what's covered by the child tasks. Do NOT suggest what should ideally be in either the main task or child tasks.

If the main task has a vague summary or minimal/missing description:
- Point out that proper analysis cannot be done without clear requirements
- Do NOT suggest what the requirements should be
- State that the main task description needs to be improved before alignment can be assessed

If the main task has clear information:
- ONLY identify specific items mentioned in the main task that aren't addressed by any child task
- Do NOT suggest additional requirements that aren't explicitly mentioned in the main task
- Focus strictly on what's out of sync between the provided information

Be very specific and stick strictly to what's mentioned in the main task versus what's covered in child tasks. Don't make assumptions about what "should" be included beyond what's explicitly stated.
`;

        console.log("Making API call to OpenAI responses endpoint");
        // Make the API call to OpenAI using Forge's fetch API with the responses endpoint
        const response = await fetch("https://api.openai.com/v1/responses", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer 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"
            },
            body: JSON.stringify({
                model: "gpt-5-mini",
                input: input
            })
        });
        console.log("Response received from OpenAI");

        if (!response.ok) {
            const errorData = await response.json();
            console.error("OpenAI API Error:", errorData);
            return { error: errorData.error?.message || 'Error from OpenAI API' };
        }

        const data = await response.json();
        console.log("OpenAI response processed", data);

        // Parse the response correctly based on the structure returned by the OpenAI API
        let analysisText = 'No analysis was generated.';

        if (data && data.output && Array.isArray(data.output)) {
            // Try to find the content array in the output array
            for (const item of data.output) {
                if (item && item.content && Array.isArray(item.content)) {
                    // Extract text from content array
                    const textContents = item.content
                        .filter(contentItem => contentItem && contentItem.text)
                        .map(contentItem => contentItem.text);

                    if (textContents.length > 0) {
                        analysisText = textContents.join('\n');
                        break;
                    }
                }
            }
        }

        return {
            content: analysisText
        };
    } catch (error) {
        console.error('Error during OpenAI analysis:', error);
        return {
            error: error.message || 'Unknown error occurred during analysis'
        };
    }
});

export const handler = resolver.getDefinitions();
