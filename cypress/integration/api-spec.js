/// <reference types="cypress" />

// replaces any current HTML in the document with new html
const writeHtml = (html) => {
  cy.document().then((doc) => {
    doc.open()
    doc.write(html)
    doc.close()
  })
}

describe('TodoMVC API', () => {
  beforeEach(() => {
    cy.request('POST', '/reset')
  })

  context('add', () => {
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
      cy.request('/').its('body').then(writeHtml)

      // now that the server response is in the test runner
      // let's query it like a normal site
      cy.get('.todo-list li')
        .should('have.length', 1)
        .first()
        .find('label')
        .should('have.text', 'new todo')
    })

    it('does not add a todo without "what" property', () => {
      cy.request('/todos').its('body').should('have.length', 0)
      cy.request('POST', '/', {
        done: false,
      })
      cy.request('/todos').its('body').should('have.length', 0)
      cy.request('POST', '/', {
        what: 'has text',
        done: false,
      })
      cy.request('/todos').its('body').should('have.length', 1)
    })
  })

  context('delete', () => {
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

    it('handles non-existent ID', () => {
      cy.request('POST', '/', {
        what: 'new todo',
      })
      cy.request('/todos').its('body').should('have.length', 1)
      cy.request('DELETE', '/', { id: 'does-not-exist' })
      cy.request('/todos').its('body').should('have.length', 1)
    })

    it('handles missing id', () => {
      cy.request('POST', '/', {
        what: 'new todo',
      })
      cy.request('/todos').its('body').should('have.length', 1)
      cy.request('DELETE', '/', {})
      cy.request('/todos').its('body').should('have.length', 1)
    })
  })

  context('complete', () => {
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

    it('handles missing id', () => {
      cy.request('POST', '/', {
        what: 'new todo',
      })
      cy.request('/todos').its('body').should('have.length', 1)
      cy.request('PATCH', '/', { done: 'true' })
      cy.request('/todos')
        .its('body')
        .should('have.length', 1)
        .its('0.done')
        .should('be.false')
    })

    it('completes todo using PATCH in the method field', () => {
      // instead of HTTP method PATCH, use "_method: PATCH" in the POST API request
      cy.request('POST', '/', {
        what: 'new todo',
      })
      cy.request('/todos')
        .its('body')
        .should('have.length', 1)
        .its('0.id')
        .then((id) => {
          cy.request('POST', '/', { _method: 'PATCH', id, done: 'true' })

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

  context('clear completed', () => {
    it('clears completed todo', () => {
      // let's add two todos and mark one of them completed
      // after clearing the completed todos we can check
      // that only 1 item remains
      cy.request('POST', '/', {
        what: 'first todo',
      })
      cy.request('POST', '/', {
        what: 'second todo',
      })
      cy.request('/todos')
        .its('body')
        .should('have.length', 2)
        .then((todos) => {
          // confirm the order of returned todos
          // our application returns the last added todo first
          expect(todos[0], 'first item').to.contain({
            what: 'second todo',
            done: false,
          })
          expect(todos[1], 'second item').to.contain({
            what: 'first todo',
            done: false,
          })

          cy.request('PATCH', '/', { id: todos[1].id, done: 'true' })
          cy.request('POST', '/clear-completed')
          // confirm a single item remains
          cy.request('/todos').its('body').should('deep.equal', [todos[0]])
        })
    })

    it('clears completed todos by clicking the button', () => {
      cy.request('POST', '/', {
        what: 'first todo',
      })
      cy.request('POST', '/', {
        what: 'second todo',
      })
      cy.visit('/')
      cy.get('.todo-list li')
        .should('have.length', 2)
        .first()
        .find('button[name=done]')
        .click()
      // after the page reloads 1 item should have class completed
      cy.get('.todo-list li.completed').should('have.length', 1)
      cy.contains('button', 'Clear completed').click()
      cy.get('.todo-list li')
        .should('have.length', 1)
        .and('not.have.class', 'completed')
    })
  })

  it('has todo page', () => {
    cy.request('POST', '/', {
      what: 'new todo',
    })

    cy.request('/todos')
      .its('body')
      .should('have.length', 1)
      .its('0.id')
      .then((id) => {
        cy.log('**render todo page HTML**')
        const url = `/todo/${id}`
        cy.request(url).its('body').then(writeHtml)
        // and confirm a single todo is shown and it is a link to itself
        cy.get('.todo-list li')
          .should('have.length', 1)
          .first()
          .find('label')
          .should('have.text', 'new todo')
          .find('a')
          .should('have.attr', 'href', url)
      })
  })

  it('has active page', () => {
    cy.request('POST', '/', {
      what: 'first todo',
    })
    cy.request('POST', '/', {
      what: 'second todo',
    })
    cy.request('/todos')
      .its('body')
      .should('have.length', 2)
      .then((todos) => {
        cy.request('PATCH', '/', { id: todos[1].id, done: 'true' })

        cy.log('**the first todo is active**')
        cy.visit('/active')
        cy.get('.todo-list li')
          .should('have.length', 1)
          .first()
          .find('label')
          .should('have.text', todos[0].what)
      })
  })

  it('has completed page', () => {
    cy.request('POST', '/', {
      what: 'first todo',
    })
    cy.request('POST', '/', {
      what: 'second todo',
    })
    cy.request('/todos')
      .its('body')
      .should('have.length', 2)
      .then((todos) => {
        cy.request('PATCH', '/', { id: todos[1].id, done: 'true' })

        cy.log('**the second todo is completed**')
        cy.visit('/completed')
        cy.get('.todo-list li')
          .should('have.length', 1)
          .first()
          .should('have.class', 'completed')
          .find('label')
          .should('have.text', todos[1].what)
      })
  })
})
