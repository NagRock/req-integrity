import React, { useEffect, useState } from "react";
import { router, view } from "@forge/bridge";

export function App() {
    const [issueId, setIssueId] = useState<string>("");

    useEffect(() => {
        const getIssueId = async () => {
            const contextData = await view.getContext();
            if (contextData && contextData.extension && contextData.extension.issue) {
                setIssueId(contextData.extension.issue.id);
            }
        };

        getIssueId();
    }, []);

    const goToGlobal = async () => {
        const targetUrl = await router.getUrl({
            target: 'module',
            moduleKey: 'req-integrity-global-page',
        });

        if (targetUrl) {
            targetUrl.searchParams.set('issueId', issueId);
            await router.navigate(targetUrl.toString());
        }
    };

    return <button onClick={goToGlobal}>Analyse</button>;
}