const expect = require("chai").expect;
const nock = require("nock");

// const getHomePage = require("../../routes/index").getHomePage;

describe("First test", () => {
  it("Should assert true to be true", () => {
    expect(true).to.be.true;
  });
});

// describe("Initial get request for home page", () => {
//   beforeEach(() => {
//     nock("http://localhost:3000/")
//       .get("/")
//       .reply(200);
//   });

//   it("Get home page", () => {
//     return getHomePage().then(response => {
//       expect(typeof response).to.equal("object");
//     });
//   });
// });
