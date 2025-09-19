const projectData = require("./modules/projects");
const express = require("express");
const app = express();
const path = require("path");
const authData = require("./modules/auth-service");
const clientSessions = require("client-sessions");
const HTTP_PORT = process.env.PORT || 8080;

app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.set("views", __dirname + "/views");
app.use(express.static("public"));
app.use(express.static(__dirname + "/public"));

app.use(
  clientSessions({
    cookieName: "session", // this is the object name that will be added to 'req'
    secret: "o6LjQ5EVNC28ZgK64hDELM18ScpFQr", // this should be a long un-guessable string.
    duration: 60 * 60 * 1000, // duration of the session in milliseconds (2 minutes)
    activeDuration: 1000 * 60 * 30, // the session will be extended by this many ms each request (1 minute)
  })
);

app.use((req, res, next) => {
  res.locals.session = req.session;
  next();
});

// initialize project files before listening
projectData
  .initialize()
  .then(authData.initialize)
  .then(function () {
    app.listen(HTTP_PORT, function () {
      console.log(`app listening on:  ${HTTP_PORT}`);
    });
  })
  .catch(function (err) {
    console.log(`unable to start server: ${err}`);
  });

function ensureLogin(req, res, next) {
  if (!req.session.user) {
    res.redirect("/login");
  } else {
    next();
  }
}

// display assignment title, my name, and student number
app.get("/", (req, res) => {
  res.render("home");
});

app.get("/about", (req, res) => {
  res.render("about");
});

// display all projects at '/solutions/projects'
app.get("/solutions/projects", (req, res) => {
  // query the sector from the search string
  let sector = req.query.sector;
  if (sector) {
    // search projects with sector string
    projectData
      .getProjectsBySector(sector)
      .then(function (projects) {
        res.render("projects", { projects: projects });
      })
      .catch(function (error) {
        // send to 404 page if error
        res.status(404).render("404", {
          message:
            "I'm sorry, we're unable to find projects with a matching sector",
        });
      });
  } else {
    // send all projects if sector not found
    projectData.getAllProjects().then(function (projects) {
      res.render("projects", { projects: projects });
    });
  }
});

app.get("/solutions/projects/:id", (req, res) => {
  let projID = parseInt(req.params.id);
  projectData
    .getProjectByID(projID) // call getProjectByID
    .then(function (project) {
      res.render("project", { project: project });
    })
    .catch(function (error) {
      res.status(404).render("404", {
        message: "I'm sorry, we're unable to find a project with that id",
      });
    });
});

// added route for addProject
app.get("/solutions/addProject", ensureLogin, (req, res) => {
  projectData
    .getAllSectors()
    .then((sectors) => {
      res.render("addProject", { sectors });
    })
    .catch((err) => {});
});

app.post("/solutions/addProject", ensureLogin, (req, res) => {
  let projData = req.body;
  projectData
    .addProject(projData)
    .then(() => {
      res.redirect("/solutions/projects");
    })
    .catch((err) => {
      res.render("500", {
        message: `I'm sorry, but we have encountered the following error: ${err}`,
      });
    });
});

app.get("/solutions/editProject/:id", ensureLogin, (req, res) => {
  let projID = parseInt(req.params.id);
  projectData
    .getProjectByID(projID)
    .then((project) => {
      projectData.getAllSectors().then((sectors) => {
        res.render("editProject", { project: project, sectors });
      });
    })
    .catch((err) => {
      res.status(404).render("404", { message: err });
    });
});

app.post("/solutions/editProject", ensureLogin, (req, res) => {
  let projID = parseInt(req.body.id);
  let projData = req.body;
  projectData
    .editProject(projID, projData)
    .then(() => {
      res.redirect("/solutions/projects");
    })
    .catch((err) => {
      res.render("500", {
        message: `I'm sorry, but we have encountered the following error: ${err}`,
      });
    });
});

app.get("/solutions/deleteProject/:id", ensureLogin, (req, res) => {
  let projID = parseInt(req.params.id);
  projectData
    .deleteProject(projID)
    .then(() => {
      res.redirect("/solutions/projects");
    })
    .catch((err) => {
      res.render("500", {
        message: `I'm sorry, but we have encountered the following error: ${err}`,
      });
    });
});

app.get("/login", (req, res) => {
  res.render("login", { errorMessage: "", userName: "" });
});

app.get("/register", (req, res) => {
  res.render("register", {
    errorMessage: "",
    successMessage: "",
    userName: "",
  });
});

app.post("/register", (req, res) => {
  let userData = req.body;
  authData
    .registerUser(userData)
    .then(() => {
      res.render("register", {
        errorMessage: "",
        successMessage: "User created",
        userName: "",
      });
    })
    .catch((err) => {
      res.render("register", {
        errorMessage: err,
        successMessage: "",
        userName: req.body.userName,
      });
    });
});

app.post("/login", (req, res) => {
  req.body.userAgent = req.get("User-Agent");
  authData
    .checkUser(req.body)
    .then((user) => {
      req.session.user = {
        userName: user.userName,
        email: user.email,
        loginHistory: user.loginHistory,
      };
      res.redirect("/solutions/projects");
    })
    .catch((err) => {
      res.render("login", {
        errorMessage: err,
        userName: req.body.userName,
      });
    });
});
app.get("/logout", ensureLogin, (req, res) => {
  req.session.reset();
  res.redirect("/");
});

app.get("/userHistory", ensureLogin, (req, res) => {
  res.render("userHistory");
});

app.use((req, res) => {
  res.status(404).render("404", {
    message: "I'm sorry, we're unable to find that view",
  });
});
