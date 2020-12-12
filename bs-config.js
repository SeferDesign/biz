var bsHttps = null;
if (process.env.SSL_KEY_PATH && process.env.SSL_CRT_PATH) {
	bsHttps = {
		key: process.env.SSL_KEY_PATH,
		cert: process.env.SSL_CRT_PATH
	};
}

module.exports = {
  proxy: 'localhost:' + (process.env.PORT || 8000),
  files: [
		'app/**/*'
	],
  ignore: [
		'node_modules'
	],
  reloadDelay: 250,
  ui: false,
	notify: false,
	open: false,
	snippetOptions: {
		rule: {
			match: /<\/head>/i,
			fn: function (snippet, match) {
				return snippet + match;
			}
		}
	},
	port: 3000,
	https: bsHttps
};
