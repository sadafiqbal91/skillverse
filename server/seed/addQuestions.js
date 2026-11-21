// Adds 6 extra questions per topic, so 3 re-tests never repeat.
const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);
require("dotenv").config();
const mongoose = require("mongoose");
const Question = require("../models/Question");

// [question, [options], correctIndex]
const EXTRA = {
  Express: [
    ["What does app.listen() do?", ["Connects to MongoDB", "Starts the server on a port", "Creates a route", "Sends a response"], 1],
    ["Which method handles a GET request?", ["app.post()", "app.fetch()", "app.get()", "app.read()"], 2],
    ["What is req.params used for?", ["Values from the URL like /users/:id", "Form data", "Cookies", "Only headers"], 0],
    ["Which status code means 'Not Found'?", ["200", "201", "500", "404"], 3],
    ["What does res.json() do?", ["Reads JSON from the body", "Sends a JSON response", "Saves to the database", "Starts the server"], 1],
    ["Where do you add error-handling middleware?", ["Before express()", "In package.json", "After all the routes", "In the React app"], 2],
  ],
  JWT: [
    ["What are the 3 parts of a JWT?", ["Header, Payload, Signature", "User, Pass, Key", "Name, Email, Role", "Start, Body, End"], 0],
    ["How does the client usually send a JWT?", ["In the URL", "Authorization: Bearer <token>", "Inside a cookie name", "In the HTML title"], 1],
    ["Which secret signs a JWT on the server?", ["The user's password", "The MongoDB URI", "JWT_SECRET from .env", "The port number"], 2],
    ["What happens when a JWT expires?", ["Nothing", "It renews itself", "The database deletes the user", "The server rejects it and the user logs in again"], 3],
    ["Should a password go inside a JWT payload?", ["No, anyone can read the payload", "Yes, always", "Only for admins", "Only if it's short"], 0],
    ["Which function checks if a token is valid?", ["jwt.sign()", "jwt.verify()", "jwt.create()", "jwt.read()"], 1],
  ],
  Security: [
    ["Why do we hash passwords with bcrypt?", ["To make login faster", "To make them shorter", "So they can't be read if the database leaks", "To send them by email"], 2],
    ["Which file must never go to GitHub?", [".env", "package.json", "README.md", "server.js"], 0],
    ["Why say 'Invalid login details' for wrong email AND wrong password?", ["It's shorter", "So attackers can't find which emails exist", "To save memory", "It's required by React"], 1],
    ["What does status 403 mean?", ["Server crashed", "Page not found", "Created", "Logged in but not allowed"], 3],
    ["Why do we grade quizzes on the server?", ["It looks nicer", "So students can't see or change the answers", "React can't add numbers", "To use less internet"], 1],
    ["What does CORS control?", ["Which websites can call your API", "Font size", "Database speed", "Password length"], 0],
  ],
  MongoDB: [
    ["What is a collection in MongoDB?", ["A single field", "A group of documents, like a table", "A password", "A server"], 1],
    ["Which Mongoose method finds one document?", ["findAll()", "getOne()", "findOne()", "pick()"], 2],
    ["What is _id?", ["The unique id of each document", "The user's name", "The database name", "A password"], 0],
    ["What does a unique index stop?", ["Slow queries", "Deleting data", "Logging in", "Duplicate values"], 3],
    ["What does populate() do?", ["Deletes linked data", "Replaces an id with the linked document", "Counts documents", "Creates a database"], 1],
    ["Which method saves a changed Mongoose document?", ["doc.write()", "doc.push()", "doc.save()", "doc.send()"], 2],
  ],
  JSX: [
    ["Which attribute adds CSS classes in JSX?", ["class", "className", "style-class", "css"], 1],
    ["How do you write JavaScript inside JSX?", ["Inside { }", "Inside ( )", "Inside [ ]", "Inside < >"], 0],
    ["What is <>...</> in React?", ["An error", "A comment", "A Fragment", "A div"], 2],
    ["How do you show a list in JSX?", ["for loop inside JSX", "array.map() with a key", "while loop", "array.join()"], 1],
    ["Why do list items need a key?", ["For CSS", "For security", "It's optional decoration", "So React can track each item"], 3],
    ["A component must return...", ["One parent element (or a Fragment)", "Only text", "A number", "Two separate elements"], 0],
  ],
  State: [
    ["Which hook creates state?", ["useEffect", "useRef", "useState", "useMemo"], 2],
    ["How should you update state?", ["Change the variable directly", "Call the setter function", "Reload the page", "Edit the DOM"], 1],
    ["What does a parent pass down to a child?", ["Props", "State only", "CSS files", "Routes"], 0],
    ["Can a child change its props directly?", ["Yes, always", "Only numbers", "Only with useEffect", "No, props are read-only"], 3],
    ["Why use setCount(c => c + 1)?", ["It's shorter", "It always uses the latest value", "It skips rendering", "It saves to the database"], 1],
    ["Where should state shared by two components live?", ["In both components", "In localStorage only", "In their closest common parent", "In index.css"], 2],
  ],
  Hooks: [
    ["When does useEffect with [] run?", ["Once, after the first render", "On every render", "Never", "Only on click"], 0],
    ["What does the function returned from useEffect do?", ["Starts the effect", "Cleans up", "Creates state", "Renders JSX"], 1],
    ["Which hook keeps a value without re-rendering?", ["useState", "useEffect", "useContext", "useRef"], 3],
    ["Where can hooks be called?", ["Inside loops", "Inside if blocks", "At the top level of a component", "In any normal function"], 2],
    ["Which hook reads a Context?", ["useContext", "useReducer", "useRef", "useId"], 0],
    ["useMemo is used to...", ["Fetch data", "Remember a calculated value", "Change the URL", "Create a component"], 1],
  ],
  "Python Basics": [
    ["Which keyword defines a function?", ["func", "function", "def", "define"], 2],
    ["What is len([1, 2, 3])?", ["3", "2", "6", "Error"], 0],
    ["What type is {'a': 1}?", ["list", "tuple", "set", "dict"], 3],
    ["Which loop runs for 0 to 4?", ["for i in 5:", "for i in range(5):", "loop(5)", "repeat 5"], 1],
    ["What does # do in Python?", ["Starts a comment", "Divides numbers", "Makes a list", "Prints text"], 0],
    ["Which one is a list?", ["(1, 2, 3)", "{1, 2, 3}", "[1, 2, 3]", "<1, 2, 3>"], 2],
  ],
  Pandas: [
    ["Which function reads a CSV file?", ["pd.open_csv()", "pd.read_csv()", "pd.load()", "pd.csv()"], 1],
    ["What does df.head() show?", ["The first 5 rows", "The last row", "Column names only", "The file size"], 0],
    ["How do you drop rows with missing values?", ["df.clean()", "df.remove()", "df.fill()", "df.dropna()"], 3],
    ["What does df['price'] return?", ["A new file", "One column (a Series)", "The first row", "An error"], 1],
    ["Which method groups rows?", ["df.sort()", "df.join()", "df.groupby()", "df.split()"], 2],
    ["What does df.shape give?", ["(rows, columns)", "Only rows", "Column types", "Memory used"], 0],
  ],
  Plants: [
    ["What do plants need to make food?", ["Only soil", "Sunlight, water and air", "Only water", "Darkness"], 1],
    ["Which part takes in water?", ["Leaves", "Flowers", "Roots", "Fruit"], 2],
    ["Which gas do plants give out?", ["Oxygen", "Smoke", "Carbon dioxide", "Steam"], 0],
    ["Where do plants make their food?", ["Roots", "Stem", "Seeds", "Leaves"], 3],
    ["What gives leaves their green colour?", ["Water", "Chlorophyll", "Soil", "Sugar"], 1],
    ["A seed grows into a...", ["Rock", "Cloud", "New plant", "Flower pot"], 2],
  ],
  "Water Cycle": [
    ["Water turning into vapour is called...", ["Evaporation", "Condensation", "Freezing", "Melting"], 0],
    ["Vapour turning into clouds is called...", ["Evaporation", "Collection", "Precipitation", "Condensation"], 3],
    ["Rain, snow and hail are called...", ["Evaporation", "Precipitation", "Clouds", "Steam"], 1],
    ["What heats the water in seas?", ["The Moon", "The wind", "The Sun", "The trees"], 2],
    ["Where does rain water collect?", ["Rivers, lakes and seas", "Only in clouds", "In the sky", "In the Sun"], 0],
    ["Clouds are made of...", ["Cotton", "Smoke", "Dust only", "Tiny drops of water"], 3],
  ],
  Fractions: [
    ["1/2 + 1/2 = ?", ["2/4", "1", "2", "1/4"], 1],
    ["Which is bigger?", ["1/4", "1/8", "1/2", "1/10"], 2],
    ["The bottom number of a fraction is the...", ["Denominator", "Numerator", "Total", "Answer"], 0],
    ["2/4 is the same as...", ["1/4", "2/2", "4/2", "1/2"], 3],
    ["What is 1/3 + 1/3?", ["2/6", "2/3", "1/9", "3/3"], 1],
    ["Half of 10 is...", ["2", "10", "5", "20"], 2],
  ],
  Decimals: [
    ["0.5 is the same as...", ["1/2", "1/5", "5", "1/50"], 0],
    ["0.3 + 0.4 = ?", ["0.12", "7", "0.07", "0.7"], 3],
    ["Which is bigger?", ["0.09", "0.9", "0.009", "0.0"], 1],
    ["2.5 + 2.5 = ?", ["4.10", "4", "5", "5.5"], 2],
    ["0.1 as a fraction is...", ["1/10", "1/100", "10/1", "1/1"], 0],
    ["Round 3.7 to the nearest whole number", ["3", "3.5", "37", "4"], 3],
  ],
};

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  let added = 0;
  for (const [topic, list] of Object.entries(EXTRA)) {
    const sample = await Question.findOne({ topic });
    if (!sample) {
      console.log(`⏭️  ${topic}: not found, skipped`);
      continue;
    }
    for (const [text, options, correctIndex] of list) {
      const exists = await Question.findOne({ topic, text });
      if (exists) continue;
      await Question.create({
        organizationId: sample.organizationId, quizId: sample.quizId, topic, text, options, correctIndex,
      });
      added++;
    }
    console.log(`✅ ${topic}: ready`);
  }
  console.log(`🎉 ${added} new questions added`);
  await mongoose.disconnect();
})().catch((e) => {
  console.error("❌", e.message);
  process.exit(1);
});