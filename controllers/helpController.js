

const HelpController = {

  index: async (req, res) => {
    return res.json({
      hello: 'world'
    })
  }
}

module.exports = HelpController;
