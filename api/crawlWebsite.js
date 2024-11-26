const puppeteer = require('puppeteer');
const { JSDOM } = require('jsdom');

// catch all uncaught exceptions and unhandled rejections
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection:', reason);
});

class WebScraper {
    constructor(startUrl, maxDepth = 2) {
        this.startUrl = startUrl;
        this.maxDepth = maxDepth;
        this.browser = null;
        this.page = null;
        this.visitedUrls = new Set();
        // TODO add more stuff
        this.ready = false;
    }
    async init() {
        this.browser = await puppeteer.launch(
            {
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
            }
        );
        this.page = await this.browser.newPage();

        // Enable request interception to block unnecessary resources
        await this.page.setRequestInterception(true);
        this.page.on('request', (req) => {
            if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
                req.abort(); // Abort loading these resource types
            } else {
                req.continue(); // Allow other requests
            }
        });

        this.ready = true;
    }
    async getPageContent(pageUrl) {
        if (!this.ready) {
            await this.init();
        }
        try {
            await this.page.goto(pageUrl, { timeout: 120000 });
            const content = await this.page.content();
            return content;
        } catch (error) {
            console.error('Error getting page content:', error);
            return '';
        }
    }

    async getAllPageUrls(pageUrl) {
        const queue = [{ url: pageUrl, depth: 0 }];
        this.visitedUrls = new Set([pageUrl]); // Initialize with the start URL
        let totalCompleted = 0;
        let totalStartTime = Date.now();
        while (queue.length > 0) {
            const { url, depth } = queue.shift();
            if (depth >= this.maxDepth) continue; // Skip if beyond max depth
    
            totalCompleted++;
            console.log(`\n\n--- Processing URL: ${url} ---`);
    
            const startTime = Date.now();
            let uniqueLinks = [];
    
            try {
                // Attempt to fetch unique links from the page
                uniqueLinks = await this.getUniqueLinks(url);
            } catch (error) {
                console.error(`Failed to get links from URL: ${url}`);
                console.error(`Error: ${error.message}`);
                console.error(error.stack);
                continue; // Skip this page and move on
            }
    
            try {
                // Filter for internal links only
                const internalLinks = uniqueLinks.filter(link => link.startsWith(this.startUrl));
    
                // Filter out already visited links BEFORE adding to queue
                const newLinks = internalLinks.filter(link => !this.visitedUrls.has(link));
    
                const endTime = Date.now();
                console.log(`Depth: ${depth}`);
                console.log(`Unique Links Found: ${uniqueLinks.length}`);
                console.log(`New Links Added: ${newLinks.length}`);
                console.log(`Queue Size: ${queue.length}`);
                console.log(`Total Completed: ${totalCompleted}`);
                console.log(`Time Taken: ${(endTime - startTime) / 1000} seconds`);
    
                // Add new links to the queue and mark them as visited
                for (const link of newLinks) {
                    this.visitedUrls.add(link); // Mark as visited immediately
                    queue.push({ url: link, depth: depth + 1 });
                }
            } catch (error) {
                console.error(`Error processing links for URL: ${url}`);
                console.error(`Error: ${error.message}`);
                console.error(error.stack);
                continue; // Skip problematic link processing and move on
            }
        }
        let totalEndTime = Date.now();
        console.log('\n--- Scraping Complete ---');
        console.log(`\nTotal Time Taken: ${(totalEndTime - totalStartTime) / 1000} seconds`);
        console.log(`Total URLs Visited: ${this.visitedUrls.size}`);
        return Array.from(this.visitedUrls); // Return all visited URLs
    }
    
    
    

    // AI: this function was generated by AI
    async getUniqueLinks(pageUrl) {
        let content = await this.getPageContent(pageUrl);
        // strip any style or linked style sheets
        content = content.replace(/<style.*?>.*?<\/style>/gs, '');
        content = content.replace(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi, '');
        // create a DOM from the content
        const dom = new JSDOM(content);
        const { document } = dom.window;
    
        // Use a Set to ensure uniqueness
        const uniqueLinks = new Set();
    
        // Select all anchor tags
        const links = document.querySelectorAll('a');
    
        links.forEach(link => {
            const href = link.getAttribute('href');
            
            // Basic filtering
            if (href && href.trim() !== '') {
                // Normalize the URL and remove hash fragment
                try {
                    // Clean the URL
                    const cleanUrl = this.cleanUrl(href);
                    uniqueLinks.add(cleanUrl);
                } catch (error) {
                    console.error(error);
                    // Ignore invalid URLs
                    console.warn(`Invalid URL: ${href}`);
                }
            }
        });
    
        // Convert Set to Array and return
        return Array.from(uniqueLinks);
    }

    cleanUrl(url) {
        // if it's a relative URL, convert to absolute
        if (!url.startsWith('http')) {
            url = new URL(url, this.startUrl).toString();
        }
        // strip hash fragments
        let urlObj = new URL(url);
        let cleanedUrl = urlObj.origin + urlObj.pathname + urlObj.search;
        // remove trailing slash
        if (cleanedUrl.endsWith('/')) {
            cleanedUrl = cleanedUrl.slice(0, -1);
        }
        // return the cleaned URL as a regular string
        return cleanedUrl;
    }

    // AI: this function was generated by AI
    async getCleanHtmlContent(pageUrl, keepAttributes = []) {
        if (!this.ready) {
            await this.init();
        }
        const content = await this.getPageContent(pageUrl);
        const dom = new JSDOM(content);
        const { document, Node } = dom.window; // Define Node for easier reference
        
        function cleanNode(node) {
            // If it's a text node, return its text content
            if (node.nodeType === Node.TEXT_NODE) {
                return node.textContent.trim();
            }
            
            // If it's an element node
            if (node.nodeType === Node.ELEMENT_NODE) {
                // Create a new element with just the tag name
                const cleanElement = document.createElement(node.tagName.toLowerCase());
                
                // Add back only the specified attributes
                for (const attr of keepAttributes) {
                    if (node.hasAttribute(attr)) {
                        cleanElement.setAttribute(attr, node.getAttribute(attr));
                    }
                }
                
                // Recursively clean child nodes
                for (const childNode of node.childNodes) {
                    const cleanedChild = cleanNode(childNode);
                    if (cleanedChild) {
                        if (typeof cleanedChild === 'string') {
                            cleanElement.appendChild(document.createTextNode(cleanedChild));
                        } else {
                            cleanElement.appendChild(cleanedChild);
                        }
                    }
                }
                
                return cleanElement;
            }
            
            // Ignore other types of nodes
            return null;
        }
        
        // Clean the body
        const cleanBody = cleanNode(dom.window.document.body);
        
        // Return the inner HTML of the cleaned body
        return cleanBody.innerHTML;
    }

}



(async () => {
    const url = 'https://chalkwild.com';
    const scraper = new WebScraper(url, 7);
    await scraper.init();
    const result = await scraper.getAllPageUrls(url);
    console.log('Total URLs:', result.length);
    // save the result to a file
    const fs = require('fs');
    fs.writeFileSync('urls.txt', result.join('\n'));
    console.log('URLs saved to urls.txt');
    await scraper.browser.close();
})();