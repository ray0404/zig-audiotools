import { useState, useEffect } from 'react';

export const useDocumentation = (path: string) => {
    const [content, setContent] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchDoc = async () => {
            setIsLoading(true);
            setError(null);
            try {
                // Assuming docs are served from /docs/ relative path
                // and path arg is like 'guide' -> /docs/guide.md
                // If path is empty, maybe load README?
                const target = path ? path : 'README';
                const url = `/docs/${target}.md`; 
                
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`Failed to load documentation: ${response.statusText}`);
                }
                const text = await response.text();
                setContent(text);
            } catch (err) {
                setError('Failed to load documentation');
                setContent('');
            } finally {
                setIsLoading(false);
            }
        };

        if (path) {
            fetchDoc();
        } else {
            // Reset if no path
             setIsLoading(false);
        }
    }, [path]);

    return { content, isLoading, error };
};
