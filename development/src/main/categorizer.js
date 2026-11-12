/**
 * i-Look Categorization Engine
 * Classifies desktop applications, window titles, and URLs into ProHance categories & impact scores
 */

const DEFAULT_RULES = [
  // Communication Tools (Productive)
  { match: /teams/i, type: 'process', category: 'Communication Tools', impact: 'Productive', rating: 2, tool: 'MS Teams' },
  { match: /outlook/i, type: 'process', category: 'Communication Tools', impact: 'Productive', rating: 2, tool: 'MS Outlook' },
  { match: /slack/i, type: 'process', category: 'Communication Tools', impact: 'Productive', rating: 2, tool: 'Slack' },
  { match: /zoom/i, type: 'process', category: 'Communication Tools', impact: 'Productive', rating: 2, tool: 'Zoom' },
  { match: /thunderbird/i, type: 'process', category: 'Communication Tools', impact: 'Productive', rating: 2, tool: 'Thunderbird' },

  // Business Tools (Productive)
  { match: /excel/i, type: 'process', category: 'Business Tools', impact: 'Productive', rating: 2, tool: 'MS Excel' },
  { match: /msaccess/i, type: 'process', category: 'Business Tools', impact: 'Productive', rating: 2, tool: 'MS Access' },
  { match: /pulse/i, type: 'title', category: 'Business Tools', impact: 'Productive', rating: 2, tool: 'Pulse Portal' },
  { match: /darwinbox/i, type: 'any', category: 'Business Tools', impact: 'Productive', rating: 2, tool: 'Darwinbox' },
  { match: /powerbi/i, type: 'any', category: 'Business Tools', impact: 'Productive', rating: 2, tool: 'Power BI' },
  { match: /tableau/i, type: 'any', category: 'Business Tools', impact: 'Productive', rating: 2, tool: 'Tableau' },
  { match: /ssms|sqlwb/i, type: 'process', category: 'Business Tools', impact: 'Productive', rating: 2, tool: 'SQL Server' },
  { match: /sap/i, type: 'any', category: 'Business Tools', impact: 'Productive', rating: 2, tool: 'SAP ERP' },

  // Documentation & Dev Tools (Productive)
  { match: /code/i, type: 'process', category: 'Documentation Tools', impact: 'Productive', rating: 2, tool: 'Visual Studio Code' },
  { match: /devenv/i, type: 'process', category: 'Documentation Tools', impact: 'Productive', rating: 2, tool: 'Visual Studio' },
  { match: /winword/i, type: 'process', category: 'Documentation Tools', impact: 'Productive', rating: 2, tool: 'MS Word' },
  { match: /powerpnt/i, type: 'process', category: 'Documentation Tools', impact: 'Productive', rating: 2, tool: 'MS PowerPoint' },
  { match: /acrord32|acrobat/i, type: 'process', category: 'Documentation Tools', impact: 'Productive', rating: 2, tool: 'Adobe Reader' },
  { match: /notepad\+\+|notepad/i, type: 'process', category: 'Documentation Tools', impact: 'Productive', rating: 2, tool: 'Notepad' },
  { match: /github\.com/i, type: 'domain', category: 'Documentation Tools', impact: 'Productive', rating: 2, tool: 'GitHub' },
  { match: /gitlab\.com/i, type: 'domain', category: 'Documentation Tools', impact: 'Productive', rating: 2, tool: 'GitLab' },
  { match: /stackoverflow\.com/i, type: 'domain', category: 'Documentation Tools', impact: 'Productive', rating: 2, tool: 'Stack Overflow' },
  { match: /notion\.so/i, type: 'domain', category: 'Documentation Tools', impact: 'Productive', rating: 2, tool: 'Notion' },
  { match: /docs\.google\.com/i, type: 'domain', category: 'Documentation Tools', impact: 'Productive', rating: 2, tool: 'Google Docs' },
  { match: /sheets\.google\.com/i, type: 'domain', category: 'Documentation Tools', impact: 'Productive', rating: 2, tool: 'Google Sheets' },
  { match: /prohance\.io|prohance/i, type: 'any', category: 'Business Tools', impact: 'Productive', rating: 2, tool: 'ProHance' },

  // System Tools (Neutral / Productive)
  { match: /explorer/i, type: 'process', category: 'System Tools', impact: 'Productive', rating: 1, tool: 'Files and Folders' },
  { match: /calc/i, type: 'process', category: 'System Tools', impact: 'Productive', rating: 1, tool: 'Calculator' },
  { match: /winscp/i, type: 'process', category: 'System Tools', impact: 'Productive', rating: 2, tool: 'WinSCP' },
  { match: /filezilla/i, type: 'process', category: 'System Tools', impact: 'Productive', rating: 2, tool: 'FileZilla' },
  { match: /taskmgr/i, type: 'process', category: 'System Tools', impact: 'System Tools', rating: 0, tool: 'Task Manager' },
  { match: /cmd|powershell|windowsterminal/i, type: 'process', category: 'System Tools', impact: 'Productive', rating: 2, tool: 'Terminal' },

  // Non-Productive (Entertainment / Social / Gaming)
  { match: /youtube\.com/i, type: 'domain', category: 'Internet Browsing', impact: 'Non Productive', rating: -2, tool: 'YouTube' },
  { match: /netflix\.com/i, type: 'domain', category: 'Internet Browsing', impact: 'Non Productive', rating: -2, tool: 'Netflix' },
  { match: /facebook\.com|instagram\.com|twitter\.com|x\.com|tiktok\.com|reddit\.com/i, type: 'domain', category: 'Internet Browsing', impact: 'Non Productive', rating: -2, tool: 'Social Media' },
  { match: /spotify/i, type: 'process', category: 'System Tools', impact: 'No Impact', rating: 0, tool: 'Spotify' },
  { match: /steam|epicgames/i, type: 'process', category: 'System Tools', impact: 'Non Productive', rating: -2, tool: 'Gaming' },

  // Generic Browsers (Neutral by default unless domain matches)
  { match: /chrome/i, type: 'process', category: 'Internet Browsing', impact: 'No Impact', rating: 0, tool: 'Google Chrome' },
  { match: /msedge/i, type: 'process', category: 'Internet Browsing', impact: 'No Impact', rating: 0, tool: 'Microsoft Edge' },
  { match: /firefox/i, type: 'process', category: 'Internet Browsing', impact: 'No Impact', rating: 0, tool: 'Mozilla Firefox' },
  { match: /brave/i, type: 'process', category: 'Internet Browsing', impact: 'No Impact', rating: 0, tool: 'Brave Browser' }
];

class Categorizer {
  constructor(customRules = []) {
    this.customRules = customRules;
  }

  setCustomRules(rules) {
    this.customRules = rules || [];
  }

  classify({ process, title, url, domain }) {
    const proc = (process || '').toLowerCase();
    const ttl = (title || '').toLowerCase();
    const dom = (domain || '').toLowerCase();
    const u = (url || '').toLowerCase();

    // Check custom rules first
    for (const rule of this.customRules) {
      if (this.matchesRule(rule, { proc, ttl, dom, u })) {
        return {
          tool: rule.tool || this.formatToolName(proc, dom),
          category: rule.category || 'Internet Browsing',
          impact: rule.impact || 'Productive',
          rating: rule.rating !== undefined ? rule.rating : 2
        };
      }
    }

    // Check default rules
    for (const rule of DEFAULT_RULES) {
      if (this.matchesRule(rule, { proc, ttl, dom, u })) {
        return {
          tool: rule.tool || this.formatToolName(proc, dom),
          category: rule.category,
          impact: rule.impact,
          rating: rule.rating
        };
      }
    }

    // Fallback if no rule matches
    const tool = this.formatToolName(proc, dom);
    return {
      tool: tool || 'Unknown Activity',
      category: 'Not Rated',
      impact: 'UNKNOWN',
      rating: 0
    };
  }

  matchesRule(rule, { proc, ttl, dom, u }) {
    if (!rule) return false;
    const pattern = rule.pattern || rule.match;
    if (!pattern) return false;

    let rx;
    if (pattern instanceof RegExp) {
      rx = pattern;
    } else {
      try {
        rx = new RegExp(pattern, 'i');
      } catch (e) {
        const escaped = pattern.toString().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        rx = new RegExp(escaped, 'i');
      }
    }

    const type = (rule.type || 'any').toLowerCase();
    if (type === 'process') {
      return rx.test(proc);
    }
    if (type === 'domain') {
      return rx.test(dom) || rx.test(u);
    }
    if (type === 'title') {
      return rx.test(ttl);
    }
    // 'any' or fallback
    return rx.test(proc) || rx.test(ttl) || rx.test(dom) || rx.test(u);
  }

  formatToolName(proc, domain) {
    if (domain) {
      const parts = domain.split('.');
      if (parts.length >= 2) {
        return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
      }
      return domain;
    }
    if (!proc) return 'System';
    return proc.charAt(0).toUpperCase() + proc.slice(1);
  }
}

module.exports = { Categorizer, DEFAULT_RULES };

