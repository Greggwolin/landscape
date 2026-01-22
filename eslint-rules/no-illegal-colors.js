module.exports = {
  meta: {
    type: "problem",
    messages: {
      illegalColor: "Color token {{token}} is not allowed in this context."
    }
  },
  create(context) {
    const forbidden = [
      "--cui-warning",
      "--cui-success"
    ];

    return {
      Literal(node) {
        if (
          typeof node.value === "string" &&
          forbidden.some(t => node.value.includes(t))
        ) {
          context.report({
            node,
            messageId: "illegalColor",
            data: { token: node.value }
          });
        }
      }
    };
  }
};
