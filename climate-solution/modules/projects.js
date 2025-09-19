require("dotenv").config();
require("pg");
const Sequelize = require("sequelize");

const sequelize = new Sequelize(
  process.env.PGDATABASE,
  process.env.PGUSER,
  process.env.PGPASSWORD,
  {
    host: process.env.PGHOST,
    dialect: "postgres",
    port: 5432,
    dialectOptions: {
      ssl: { rejectUnauthorized: false },
    },
  }
);

const Sector = sequelize.define(
  "Sector",
  {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    sector_name: Sequelize.STRING,
  },
  {
    createdAt: false,
    updatedAt: false,
  }
);

const Project = sequelize.define(
  "Project",
  {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    title: Sequelize.STRING,
    feature_img_url: Sequelize.STRING,
    summary_short: Sequelize.TEXT,
    intro_short: Sequelize.TEXT,
    impact: Sequelize.TEXT,
    original_source_url: Sequelize.STRING,
  },
  {
    createdAt: false,
    updatedAt: false,
  }
);

Project.belongsTo(Sector, { foreignKey: "sector_id" });

/* initialize function will now check for sync(). */
function initialize() {
  return new Promise(function (resolve) {
    sequelize
      .sync()
      .then(() => {
        resolve();
      })
      .catch((err) => {
        reject(err);
      });
  });
}

/* function to return all projects from the db */
function getAllProjects() {
  return Project.findAll({
    include: [Sector], // includes sector data
  });
}

/* function searches within table to find project by id */
function getProjectByID(projectId) {
  return Project.findAll({
    include: [Sector],
    where: { id: projectId },
  }).then((results) => {
    if (results.length > 0) {
      return results[0]; // resolve with the first project
    } else {
      return Promise.reject("Unable to find requested project");
    }
  });
}

/* function to return projects with specified sector */
function getProjectsBySector(sector) {
  return Project.findAll({
    include: [Sector],
    where: {
      "$Sector.sector_name$": {
        [Sequelize.Op.iLike]: `%${sector}%`,
      },
    },
  }).then((results) => {
    if (results.length > 0) {
      return results; // return all projects that match
    } else {
      return Promise.reject("Unable to find requested projects");
    }
  });
}

// function to add project to database
function addProject(projectData) {
  return Project.create(projectData)
    .then(() => {
      return;
    })
    .catch((err) => {
      // return promise rejection
      return Promise.reject(err.errors[0].message);
    });
}

// retrieves sectors from database
function getAllSectors() {
  return Sector.findAll()
    .then((sectors) => {
      return sectors;
    })
    .catch((err) => {
      return Promise.reject(err);
    });
}

// updates project based on id
function editProject(id, projectData) {
  return Project.update(projectData, { where: { id: id } })
    .then(() => {
      return;
    })
    .catch((err) => {
      return Promise.reject(err.errors[0].message);
    });
}

// deletes project based on id
function deleteProject(id) {
  return Project.destroy({ where: { id: id } })
    .then(() => {
      return;
    })
    .catch((err) => {
      return Promise.reject(err.errors[0].message);
    });
}

module.exports = {
  initialize,
  getAllProjects,
  getProjectByID,
  getProjectsBySector,
  addProject,
  getAllSectors,
  editProject,
  deleteProject,
};
