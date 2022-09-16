import { ApolloServer, gql, UserInputError } from 'apollo-server';
import { v4 as uuid } from 'uuid';
import axios from 'axios';

// Local Data
const persons = [
  {
    name: 'Ruben',
    phone: '3003151763',
    street: 'Calle 116 # 34 - 103',
    city: 'Barranquilla',
    id: 'lskjgwja-9qir09fdij-9qur9jfj-09sadujf'
  },
  {
    name: 'Juan',
    phone: '3003151763',
    street: 'Calle 116 # 34 - 103',
    city: 'Barranquilla',
    id: '18340uew-9qir09fdij-9qur9jfj-09sadujf'
  },
  {
    name: 'Yan Carlos',
    street: 'Calle 116 # 34 - 103',
    city: 'Barranquilla',
    id: 'lhdfpoef-9qir09fdij-9qur9jfj-09sadujf'
  },
  {
    name: 'Nicolasa',
    phone: '300384343',
    street: 'Calle 116 # 34 - 103',
    city: 'Barranquilla',
    id: 'ijdsop-9qir09fdij-9qur9jfj-09sadujf'
  }
];

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
    personCount: () => persons.length,
    allPersons: async (root, args) => {
      const { data:personsAPI } = await axios.get('http://localhost:3000/persons')
      if (!args.phone) return personsAPI
      const byPhone = person => args.phone === 'YES' ? person.phone : !person.phone
      return personsAPI.filter(byPhone)
    },
    findPerson: (root, args) => {
      const { name } = args;
      return persons.find(person => person.name === name);
    },
    findPersonID: (root, args) => {
      const { id } = args;
      return persons.find(person => person.id === id);
    },
  },
  // Mutations
  Mutation: {
    addPerson: (root, args) => {
      if (persons.find(p => p.name === args.name)){
        throw new UserInputError('Name must be unique', {
          invalidArgs: args.name
        })
      }
      const person = {... args, id: uuid()}
      persons.push(person)
      return person
    },
    editPhone: (root, args) => {
      const personIndex = persons.findIndex(p => p.id === args.id);

      if (personIndex === -1) return null

      const person = persons[personIndex];

      const updatePerson = {...person, phone: args.phone};
      persons[personIndex] = updatePerson;

      return updatePerson
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
