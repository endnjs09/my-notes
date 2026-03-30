import { createContentLoader } from 'vitepress'

export default createContentLoader('/**/*.md', {
  includeSrc: false, // We only need frontmatter and URL, not full markdown content
  render: false,     // Don't render HTML
  transform(rawData) {
    // 1. Filter out the homepage and other non-post pages
    const posts = rawData.filter(page => {
      // Exclude main index and examples
      if (page.url === '/' || page.url.includes('api-examples') || page.url.includes('markdown-examples')) {
        return false;
      }
      return true;
    })

    // 2. Map the data into a simpler structure, extracting frontmatter
    return posts.map(page => {
      // Fallback title to the filename/URL if not specified in frontmatter
      const fallbackTitle = page.url.split('/').pop()?.replace('.html', '').replace(/-/g, ' ') || 'Untitled';
      // Attempt to extract category from URL (e.g. /Chapter-01/...)
      const categoryMatch = page.url.match(/\/(.*?)\//);
      const category = categoryMatch ? categoryMatch[1].replace('-', ' ') : 'General';
      
      // We will parse date from the frontmatter if available, or just leave it blank since we might not have dates for everything initially
      const date = page.frontmatter.date ? new Date(page.frontmatter.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
      
      return {
        title: page.frontmatter.title || fallbackTitle,
        url: page.url,
        date: date,
        category: category,
        excerpt: page.frontmatter.description || ''
      }
    }).sort((a, b) => {
      // Sort logic here if you have dates, for now we just sort arbitrarily or alphabetically
      return b.url.localeCompare(a.url);
    })
  }
})
