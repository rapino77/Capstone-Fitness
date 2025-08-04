# n8n Integration Guide for Fitness Command Center

## Overview

This guide explains how to set up n8n automation workflows for your Fitness Command Center. n8n will handle automated insights, notifications, and intelligent recommendations based on your fitness data.

## Prerequisites

1. **n8n Instance**: Deploy n8n on Railway, Render, or self-hosted
2. **Webhook URL**: Your Netlify function endpoint: `https://your-site.netlify.app/.netlify/functions/n8n-webhook`
3. **Environment Variables**: Set up required credentials

## Environment Variables

Add these to your Netlify environment variables:

```bash
# n8n Integration
N8N_WEBHOOK_SECRET=your_secure_webhook_secret
N8N_API_KEY=your_n8n_api_key

# Notification Services (Optional)
EMAILJS_SERVICE_ID=your_emailjs_service_id
DISCORD_WEBHOOK_URL=your_discord_webhook_url
SLACK_WEBHOOK_URL=your_slack_webhook_url
```

## Core Automation Workflows

### 1. PR Detection & Celebration Workflow

**Trigger**: Daily schedule (check for new workouts)
**Purpose**: Detect personal records and send celebration notifications

**Workflow Steps**:
1. **Schedule Trigger** (Daily at 8 PM)
2. **HTTP Request** to webhook:
   ```json
   {
     "action": "trigger_pr_check",
     "type": "pr_detection",
     "payload": {
       "userId": "default-user"
     }
   }
   ```
3. **If Node** (Check if PRs detected > 0)
4. **Send Notification** (Email/Discord/Slack)
5. **Log to Airtable** (Optional tracking)

### 2. Goal Milestone Monitor

**Trigger**: When goal progress is updated (webhook from goal-progress API)
**Purpose**: Celebrate milestones (25%, 50%, 75%, 100%)

**Workflow Steps**:
1. **Webhook Trigger** (Listen for goal updates)
2. **HTTP Request** to check milestones:
   ```json
   {
     "action": "goal_milestone_check",
     "type": "milestone_detection",
     "payload": {
       "userId": "default-user",
       "goalId": "{{$json.goalId}}"
     }
   }
   ```
3. **If Node** (Check milestones detected)
4. **Send Celebration** (Multi-channel notification)

### 3. Weekly Progress Report

**Trigger**: Weekly schedule (Sunday evenings)
**Purpose**: Generate comprehensive weekly fitness summary

**Workflow Steps**:
1. **Schedule Trigger** (Weekly, Sunday 6 PM)
2. **HTTP Request** for report generation:
   ```json
   {
     "action": "weekly_report",
     "type": "progress_summary",
     "payload": {
       "userId": "default-user"
     }
   }
   ```
3. **Format Report** (HTML/Markdown formatting)
4. **Send Email Report** (Detailed summary)
5. **Post to Discord/Slack** (Quick summary)

### 4. Smart Workout Recommendations

**Trigger**: Daily morning schedule
**Purpose**: Suggest next workout based on patterns

**Workflow Steps**:
1. **Schedule Trigger** (Daily at 7 AM)
2. **HTTP Request** for recommendations:
   ```json
   {
     "action": "workout_recommendation",
     "type": "ai_suggestion",
     "payload": {
       "userId": "default-user"
     }
   }
   ```
3. **Format Recommendation**
4. **Send Morning Motivation** (Push notification/email)

### 5. Weight Trend Alerts

**Trigger**: When new weight is logged
**Purpose**: Alert on rapid weight changes

**Workflow Steps**:
1. **Webhook Trigger** (From weight logging)
2. **HTTP Request** for trend analysis:
   ```json
   {
     "action": "weight_trend_alert",
     "type": "health_monitoring",
     "payload": {
       "userId": "default-user",
       "alertThreshold": 2
     }
   }
   ```
3. **If Node** (Check if alert triggered)
4. **Send Health Alert** (Important notification)

## n8n Workflow Templates

### Basic PR Detection Workflow

```json
{
  "name": "Fitness PR Detection",
  "nodes": [
    {
      "parameters": {
        "rule": {
          "interval": [
            {
              "field": "cronExpression",
              "value": "0 20 * * *"
            }
          ]
        }
      },
      "name": "Daily PR Check",
      "type": "n8n-nodes-base.cron",
      "typeVersion": 1,
      "position": [250, 300]
    },
    {
      "parameters": {
        "url": "https://your-site.netlify.app/.netlify/functions/n8n-webhook",
        "options": {
          "headers": {
            "X-N8N-Webhook-Secret": "{{$env.N8N_WEBHOOK_SECRET}}"
          }
        },
        "jsonParameters": true,
        "bodyParametersJson": "{\n  \"action\": \"trigger_pr_check\",\n  \"type\": \"pr_detection\",\n  \"payload\": {\n    \"userId\": \"default-user\"\n  }\n}"
      },
      "name": "Check for PRs",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 1,
      "position": [450, 300]
    },
    {
      "parameters": {
        "conditions": {
          "number": [
            {
              "value1": "={{$json.result.prsDetected}}",
              "operation": "larger",
              "value2": 0
            }
          ]
        }
      },
      "name": "PRs Detected?",
      "type": "n8n-nodes-base.if",
      "typeVersion": 1,
      "position": [650, 300]
    }
  ],
  "connections": {
    "Daily PR Check": {
      "main": [
        [
          {
            "node": "Check for PRs",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Check for PRs": {
      "main": [
        [
          {
            "node": "PRs Detected?",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  }
}
```

### Goal Milestone Celebration

```json
{
  "name": "Goal Milestone Celebration",
  "nodes": [
    {
      "parameters": {
        "path": "goal-milestone",
        "options": {}
      },
      "name": "Goal Update Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [250, 300],
      "webhookId": "goal-milestone-webhook"
    },
    {
      "parameters": {
        "url": "https://your-site.netlify.app/.netlify/functions/n8n-webhook",
        "options": {
          "headers": {
            "X-N8N-Webhook-Secret": "{{$env.N8N_WEBHOOK_SECRET}}"
          }
        },
        "jsonParameters": true,
        "bodyParametersJson": "{\n  \"action\": \"goal_milestone_check\",\n  \"type\": \"milestone_detection\",\n  \"payload\": {\n    \"userId\": \"default-user\",\n    \"goalId\": \"{{$json.goalId}}\"\n  }\n}"
      },
      "name": "Check Milestones",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 1,
      "position": [450, 300]
    }
  ]
}
```

## Notification Integrations

### Email Notifications (EmailJS)

```javascript
// In n8n Function node
const emailData = {
  service_id: $env.EMAILJS_SERVICE_ID,
  template_id: 'fitness_pr_template',
  user_id: $env.EMAILJS_USER_ID,
  template_params: {
    user_name: 'Fitness Warrior',
    exercise: $json.result.exercise,
    new_pr: $json.result.newPR,
    improvement: $json.result.improvement,
    date: new Date().toLocaleDateString()
  }
};

return emailData;
```

### Discord Notifications

```javascript
// Discord webhook payload
const discordMessage = {
  embeds: [{
    title: "🏆 New Personal Record!",
    description: `Congratulations! You just set a new PR!`,
    color: 0x00ff00,
    fields: [
      {
        name: "Exercise",
        value: $json.result.exercise,
        inline: true
      },
      {
        name: "New PR",
        value: `${$json.result.newPR} lbs`,
        inline: true
      },
      {
        name: "Improvement",
        value: `+${$json.result.improvement} lbs`,
        inline: true
      }
    ],
    timestamp: new Date().toISOString()
  }]
};

return discordMessage;
```

## Testing Webhooks

Use these curl commands to test your webhook endpoints:

```bash
# Test PR Detection
curl -X POST https://your-site.netlify.app/.netlify/functions/n8n-webhook \
  -H "Content-Type: application/json" \
  -H "X-N8N-Webhook-Secret: your_secret" \
  -d '{
    "action": "trigger_pr_check",
    "type": "pr_detection",
    "payload": {
      "userId": "default-user",
      "exerciseName": "Bench Press"
    }
  }'

# Test Goal Milestone Check
curl -X POST https://your-site.netlify.app/.netlify/functions/n8n-webhook \
  -H "Content-Type: application/json" \
  -H "X-N8N-Webhook-Secret: your_secret" \
  -d '{
    "action": "goal_milestone_check",
    "type": "milestone_detection",
    "payload": {
      "userId": "default-user"
    }
  }'
```

## Deployment Steps

1. **Deploy n8n Instance**:
   - Railway: Connect GitHub repo, set environment variables
   - Render: Deploy from Docker image, configure environment
   - Self-hosted: Use Docker Compose

2. **Import Workflows**:
   - Copy workflow JSON templates
   - Update webhook URLs with your Netlify domain
   - Set environment variables in n8n

3. **Configure Webhooks**:
   - Set webhook secrets in both n8n and Netlify
   - Test webhook connectivity
   - Enable workflows

4. **Set up Notifications**:
   - Configure EmailJS for email notifications
   - Add Discord/Slack webhook URLs
   - Test notification delivery

## Monitoring & Troubleshooting

- **n8n Execution Log**: Check workflow execution history
- **Netlify Function Logs**: Monitor webhook processing
- **Airtable Activity**: Verify data updates
- **Notification Delivery**: Test message reception

## Advanced Workflows

Future workflow ideas:
- **Plateau Detection**: Alert when progress stalls
- **Injury Prevention**: Monitor volume increases
- **Nutrition Reminders**: Based on workout intensity
- **Social Challenges**: Community engagement
- **Photo Progress**: Automated progress photo reminders

## Security Considerations

- Always use webhook secrets
- Validate payload data
- Rate limit webhook endpoints
- Monitor for suspicious activity
- Keep API keys secure