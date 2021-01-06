/// <reference types="cypress" />

describe('TodoMVC API', () => {
  beforeEach(() => {
    cy.request('POST', '/reset')
  })

  it('adds a todo', () => {
    cy.request('/todos').its('body').should('have.length', 0)
    cy.request('POST', '/', {
      what: 'new todo',
    })
    cy.request('/todos')
      .its('body')
      .should('have.length', 1)
      .its('0')
      .should('include', {
        what: 'new todo',
        done: false,
      })
      .and('have.property', 'id')
      // our uuid is lowercase
      .should(
        'match',
        /^[0-9a-f]{8}\b-[0-9a-f]{4}\b-[0-9a-f]{4}\b-[0-9a-f]{4}\b-[0-9a-f]{12}$/,
      )

    cy.log('**render HTML**')
    cy.request('/')
      .its('body')
      .then((html) => {
        cy.document().then((doc) => {
          doc.write(html)
        })
      })

    // now that the server response is in the test runner
    // let's query it like a normal site
    cy.get('.todo-list li')
      .should('have.length', 1)
      .first()
      .find('label')
      .should('have.text', 'new todo')
  })

  it('deletes todo', () => {
    cy.request('POST', '/', {
      what: 'new todo',
    })
    cy.request('/todos')
      .its('body')
      .should('have.length', 1)
      .its('0.id')
      .then((id) => {
        cy.request('DELETE', '/', { id })
      })

    // after deleting the todo, we should get back to zero todos
    cy.request('/todos').its('body').should('have.length', 0)
  })

  it('completes todo', () => {
    cy.request('POST', '/', {
      what: 'new todo',
    })
    cy.request('/todos')
      .its('body')
      .should('have.length', 1)
      .its('0.id')
      .then((id) => {
        cy.request('PATCH', '/', { id, done: 'true' })

        // confirm the todo was marked
        cy.request('/todos')
          .its('body')
          .should('deep.equal', [
            {
              id,
              what: 'new todo',
              done: true,
            },
          ])
      })
  })
})
