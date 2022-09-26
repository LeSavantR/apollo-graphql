import { ApolloServer, AuthenticationError, gql, UserInputError } from 'apollo-server';
import jwt from 'jsonwebtoken';
import './db.js';
import Person from './models/person.js';
import User from './models/user.js';
import { PubSub } from 'graphql-subscriptions'

const JWT_SECRET = 'AQUI_TU_PALABRA_SECRETA_PARA_GENERAR_TOKENS_SEGUROS'

const pubsub = new PubSub()
const SUBS_EVENT = {
  PERSON_ADDED: 'PERSON_ADDED'
}

// Type Definitions GraphQL
const typeDef = gql`
  enum YesNo {
    YES
    NO
  }

  type Address {
    street: String!
    city: String
  }

  type Person {
    name: String!
    phone: String
    address: Address!
    id: ID!
  }

  type User {
    id: ID!
    username: String!
    friends: [Person]!
  }

  type Token {
    value: String!
  }

  type Query {
    personCount: Int!
    allPersons(phone: YesNo): [Person]!
    findPerson(name: String!): Person
    me: User
  }

  type Mutation {
    addPerson(
      name: String!
      phone: String
      street: String!
      city: String!
    ): Person

    editPhone(
      id: ID!
      phone: String!
    ): Person

    createUser(
      username: String!
    ): User

    login(
      username: String!
      password: String!
    ): Token
    addAsFriend(
      name: String!
    ): User
  }

  type Subscription {
    personAdded: Person!
  }
`;

// Resolvers for GraphQL
const resolver = {
  // Queries
  Query: {
    personCount: () => Person.collection.countDocuments(),
    allPersons: async (root, args) => {
      if (!args.phone) return Person.find({})
      return Person.find({ phone: { $exists: args.phone === 'YES' } })
    },
    findPerson: (root, args) => {
      const { name } = args;
      return Person.findOne({ name })
    },
    me: (root, args, context) => {
      return context.currentUser
    },
  },
  // Mutations
  Mutation: {
    addPerson: async (root, args, context) => {
      const { currentUser } = context;
      if(!currentUser) {
        throw new AuthenticationError('Not Authenticated')
      };

      const person = new Person({ ... args });
      try {
        await person.save()
        currentUser.friends = currentUser.friends.concat(person);
        await currentUser.save()
      } catch (error) {
        throw new UserInputError(error.message, {
          invalidArgs: args
        })
      }

      pubsub.publish(SUBS_EVENT.PERSON_ADDED, { personAdded: person})
      return person
    },
    editPhone: async (root, args) => {
      const { id } = args
      const person = await Person.findById({ _id: id })
      if (!person) return

      person.phone = args.phone

      try {
        await person.save()
      } catch (error) {
        throw new UserInputError(error.message, {
          invalidArgs: args
        })
      }

      return person
    },
    createUser: async (root, args) => {
      const user = new User({ username: args.username })

      try {
        await user.save()
      } catch (error) {
        throw new UserInputError(error.message, {
          invalidArgs: args
        })
      }

      return user
    },
    login: async (root, args) => {
      const user = await User.findOne({ username: args.username })

      if(!user || args.password !== 'midupassword') {
        throw new UserInputError('Wrong credentials')
      }

      const userForToken = {
        username: args.username,
        id: user._id
      }

      return {
        value: jwt.sign(userForToken, JWT_SECRET)
      }
    },
    addAsFriend: async (root, { name }, { currentUser }) => {
      if(!currentUser) throw new AuthenticationError('Not Authenticated');
      const person = await Person.findOne({ name })

      const nonFriendlyAlready = person => !currentUser.friends.map(p => p._id).includes(person._id)

      if (nonFriendlyAlready(person)) {
        currentUser.friends = currentUser.friends.concat(person)
        await currentUser.save()
      }
      return currentUser
    },
  },
  // Mutate Object Person
  Person: {
    address: (root) => {
      return {
        street: root.street,
        city: root.city
      };
    },
  },
  Subscription: {
    personAdded: {
      subscribe: () => pubsub.asyncIterator([SUBS_EVENT.PERSON_ADDED])
    }
  }
};

// Instance for ApolloServer
const server = new ApolloServer({
  typeDefs: typeDef,
  resolvers: resolver,
  context: async ({ req }) => {
    const auth = req ? req.headers.authorization : null;
    if (auth && auth.toLowerCase().startsWith('bearer ')) {
      const token = auth.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET);
      const currentUser = await User.findById(decoded.id).populate('friends');
      return { currentUser };
    };
  }
})

// Execution
server.listen().then(({ url, subscriptionsUrl }) => {
  console.log(`Server ready at ${url}`)
})
