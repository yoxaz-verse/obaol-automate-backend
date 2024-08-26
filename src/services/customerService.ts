import customerRepository from '../repositories/customerRepository';

class CustomerService {
    getAll() {
        return customerRepository.findAll();
    }

    getOne(id) {
        return customerRepository.findById(id);
    }

    create(data) {
        return customerRepository.create(data);
    }

    update(id, data) {
        return customerRepository.update(id, data);
    }

    delete(id) {
        return customerRepository.delete(id);
    }
}

export default new CustomerService();
