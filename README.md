Development Process

This project was developed as part of the Frontend Essentials course.

The development started by creating the basic HTML structure and page layouts. CSS was then used to make the website responsive for desktop, tablet, and mobile devices. JavaScript was added to create interactive features such as the shopping basket, newsletter form validation, map integration, and AI-inspired chatbot.

Throughout development, testing was carried out regularly to ensure that features worked correctly across different screen sizes and browsers.

Challenges and Solutions

Responsive Design

One challenge was making the website look good on different screen sizes.

**Solution:** CSS Grid, Flexbox, and media queries were used to create flexible layouts that adapt to different devices.

Basket Persistence

Another challenge was keeping products in the basket after refreshing the page.

**Solution:** LocalStorage was used to save and retrieve basket data.

Map Integration

Integrating the map and displaying farm locations required learning how to use a mapping API.

**Solution:** The Google Maps JavaScript API was implemented and tested using an API key stored outside the repository.

Chatbot Functionality

Creating an AI-inspired chatbot without a backend service was challenging.

**Solution:** A rule-based chatbot was developed to answer common questions about products, farms, and deliveries.

Resources Used

The following resources were used during development:

- Course lectures and learning materials
- MDN Web Docs (HTML, CSS, JavaScript, and LocalStorage)
- Google Maps JavaScript API Documentation
- W3Schools tutorials and examples
- ChatGPT for debugging, troubleshooting, and learning new concepts

Design Decisions

Several design decisions were made during development:

- LocalStorage was chosen to store basket data because the project is frontend-only.
- Google Maps was used to help users locate partner farms.
- The chatbot was designed to provide simple assistance and demonstrate AI-inspired functionality.
- A responsive design was prioritised to ensure usability across multiple devices.

Installation

1. Download or clone the project files.
2. Open the project folder in Visual Studio Code.
3. Install the **Live Server** extension if you do not already have it.
4. Right-click on `index.html` and select **Open with Live Server**.
5. The website will open in your browser.

The project should be run using a local server rather than opening the HTML files directly. This ensures that all features, including the map and AI functionality, work correctly.

API Key Setup

The AI features require an OpenAI API key.

Step 1: Get an API Key

1. Go to https://platform.openai.com/api-keys
2. Sign in to your OpenAI account.
3. Click **Create new secret key**.
4. Copy the API key.

Step 2: Add the API Key

1. Open `main.js`.
2. Find the following line:

```javascript
const OPENAI_API_KEY = "placeholder";
```

3. Replace `placeholder` with your own API key.
4. Save the file.

Step 3: Test the AI Features

1. Start the project using Live Server.
2. Open the products page and try the AI search feature.
3. Open the chat page and ask the chatbot a question.

If the AI responds correctly, the API key has been added successfully.

Important

For security reasons, the API key is not included in this repository and should not be uploaded to GitHub or shared publicly.
