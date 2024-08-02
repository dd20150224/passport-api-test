

const HomeController = {

  home: async (req, res) => {
    res.render('index', {title: 'Chatbots'});
  },

  dashboard: async (req, res) => {
    return res.render('dashboard', {hello: 'world'});
  }
}

module.exports = HomeController;
