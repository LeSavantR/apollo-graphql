import { ApolloServer, gql } from 'apollo-server';
import './db.js';
import Person from './models/person.js';


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

  type Query {
    personCount: Int!
    allPersons(phone: YesNo): [Person]!
    findPerson(name: String!): Person
    findPersonID(id: ID!): Person
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
  }
`;

// Resolvers for GraphQL
const resolver = {
  // Queries
  Query: {
    personCount: () => Person.collection.countDocuments(),
    allPersons: async (root, args) => {
      return Person.find({})
    },
    findPerson: (root, args) => {
      const { name } = args;
      return Person.findOne({ name })
    },
    // findPersonID: (root, args) => {
    //   const { id } = args;
    //   return Person.findOne({ id });
    // },
  },
  // Mutations
  Mutation: {
    addPerson: (root, args) => {
      const person = new Person({ ... args })
      return person.save()
    },
    editPhone: async (root, args) => {
      const person = await Person.findOne({ name: args.name })
      person.phone = args.phone
      return person.save()
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
};

// Instance for ApolloServer
const server = new ApolloServer({
  typeDefs: typeDef,
  resolvers: resolver
})

// Execution
server.listen().then(({url}) => {console.log(`Server ready at ${url}`)})
